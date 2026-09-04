import { Depot } from '../../domain/entities/Depot';
import { DeliveryStop } from '../../domain/entities/DeliveryStop';
import { Driver } from '../../domain/entities/Driver';
import { Route } from '../../domain/entities/Route';
import { DistributionResult, OptimizationMetrics, DistributionWarning } from '../../domain/entities/DistributionResult';
import { OptimizationConfig } from '../../domain/value-objects/OptimizationConfig';
import { CapacityDomainService } from '../../domain/services/CapacityDomainService';
import { CapacityValidationService } from '../../domain/services/CapacityValidationService';
import { OptimizationEvaluationService, ObjectiveScoreBreakdown } from '../../domain/services/OptimizationEvaluationService';
import { RouteSequenceOptimizer } from '../../domain/services/RouteSequenceOptimizer';
import { DistributionInvariantValidator } from '../../domain/services/DistributionValidator';
import { RouteMatrix, IRoutingService } from '../../application/ports/IRoutingService';
import { IOptimizationService, OptimizationRequest } from '../../application/ports/IOptimizationService';
import { RoutingUnavailableError } from '../../domain/errors/DomainErrors';

interface DriverBucket {
  readonly driver: Driver;
  readonly driverId: string;
  stops: DeliveryStop[];
  totalWeightKg: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

export class OptimizationEngine implements IOptimizationService {
  /**
   * Main entry point for Stage 5 Vehicle Routing Optimization and Driver Assignment.
   *
   * Architectural Specification:
   * 1. Metaheuristic Paradigm:
   *    The engine employs a deterministic multi-stage Vehicle Routing Metaheuristic:
   *    - Construction Heuristic: Best-Insertion minimizing road insertion distance subject to hard 110% capacity.
   *    - Objective Function: Multi-objective composite scoring (70% Distance + 30% Relative Capacity Load Balance).
   *    - Local Search: Inter-route neighborhood exploration (Move and Swap) with intra-route 2-Opt edge exchanges.
   *    This guarantees high-quality, operationally feasible local optima in real time without simulating an
   *    NP-hard unconstrained mathematical global solver.
   *
   * 2. Hard Operational Invariants:
   *    - Active Drivers Only (Inactive drivers receive 0 stops, 0 kg, 0 meters)
   *    - 110% Maximum Capacity Buffer (totalWeightKg <= maximumLoadKg * 1.10)
   *    - Atomicity: Delivery Lists and Buyer Stops are never split across drivers
   *    - Closed Depot Loops: DEPOT -> Stops -> DEPOT
   */
  public async optimize(request: OptimizationRequest): Promise<DistributionResult> {
    const startTime = performance.now();
    const { depot, stops, drivers, config, routingService } = request;

    // 1. Filter active drivers only (Inactive drivers receive 0 stops, 0 kg, 0 distance)
    const activeDrivers = drivers.filter(d => d.active);

    // 2. Validate Empty Input / Zero Stops
    if (stops.length === 0) {
      return new DistributionResult({
        routes: [],
        unassignedStops: [],
        oversizedStops: [],
        warnings: [],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        totalWeightKg: 0,
        driversUsed: 0,
        metrics: {
          initialDistanceMeters: 0,
          finalDistanceMeters: 0,
          initialLoadVariance: 0,
          finalLoadVariance: 0,
          finalOptimizationScore: 0,
          totalDurationSeconds: 0,
          iterationCount: 0,
          executionDurationMs: Math.round(performance.now() - startTime),
          activeDriversUsed: 0
        }
      });
    }

    // 3. Handle Zero Active Drivers
    if (activeDrivers.length === 0) {
      const totalWeight = stops.reduce((sum, s) => sum + s.totalWeightKg, 0);
      return new DistributionResult({
        routes: [],
        unassignedStops: [...stops],
        oversizedStops: [],
        warnings: [{
          code: 'NO_ACTIVE_DRIVERS',
          message: 'No active drivers available in fleet to receive delivery stops.',
          messageKey: 'warnings.noActiveDrivers'
        }],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        totalWeightKg: totalWeight,
        driversUsed: 0,
        metrics: {
          initialDistanceMeters: 0,
          finalDistanceMeters: 0,
          initialLoadVariance: 0,
          finalLoadVariance: 0,
          finalOptimizationScore: 0,
          totalDurationSeconds: 0,
          iterationCount: 0,
          executionDurationMs: Math.round(performance.now() - startTime),
          activeDriversUsed: 0
        }
      });
    }

    // 4. Retrieve and verify Road Distance Matrix
    // The optimizer consumes the road matrix from Stage 4
    const matrix = await routingService.getRouteMatrix({
      origins: [
        { id: 'DEPOT', point: depot.getGeoPoint(), name: depot.name },
        ...stops.map(s => ({ id: s.stopId, point: s.getGeoPoint(), name: s.buyerName }))
      ],
      destinations: [
        { id: 'DEPOT', point: depot.getGeoPoint(), name: depot.name },
        ...stops.map(s => ({ id: s.stopId, point: s.getGeoPoint(), name: s.buyerName }))
      ]
    });

    // Check for missing/unroutable required pairs in the matrix
    const locationIndexMap = new Map<string, number>();
    matrix.origins.forEach((loc, idx) => locationIndexMap.set(loc.id, idx));

    if (!locationIndexMap.has('DEPOT')) {
      throw new RoutingUnavailableError('Depot location is missing from routing matrix.');
    }

    // 5. Partition stops into Oversized vs Assignable
    const fleetCapacity = CapacityValidationService.evaluateFleetCapacity(activeDrivers);
    const maxSingleDriverOperationalCapacity = fleetCapacity.maxActiveDriverCapacityKg;

    const oversizedStops: DeliveryStop[] = [];
    const assignableStops: DeliveryStop[] = [];

    for (const stop of stops) {
      if (CapacityValidationService.isStopOversized(stop.totalWeightKg, maxSingleDriverOperationalCapacity)) {
        oversizedStops.push(stop);
      } else {
        assignableStops.push(stop);
      }
    }

    // 6. Heuristic Initial Solution Generation
    // Generate Candidate 1: Capacity-Aware Distance Savings Construction (Sorted by distance from depot & weight)
    const initialBuckets = this.generateInitialSolution(
      assignableStops,
      activeDrivers,
      locationIndexMap,
      matrix
    );

    // Initial Sequencing for all buckets
    let totalInitialDistance = 0;
    for (const bucket of initialBuckets) {
      if (bucket.stops.length > 0) {
        const seq = RouteSequenceOptimizer.optimizeSequence(
          bucket.stops,
          locationIndexMap,
          matrix
        );
        bucket.stops = [...seq.orderedStops];
        bucket.totalDistanceMeters = seq.distanceMeters;
        bucket.totalDurationSeconds = seq.durationSeconds;
        totalInitialDistance += seq.distanceMeters;
      }
    }

    // Architectural Note:
    // `referenceDistanceMeters` is the deterministic initial-solution baseline used to normalize candidate
    // distances during this optimization run. This establishes an empirical baseline representing the greedy
    // construction quality, against which all subsequent local-search neighborhood moves and swaps are measured.
    const referenceDistance = Math.max(totalInitialDistance, 10000); // stable baseline reference

    const initialEvaluation = OptimizationEvaluationService.evaluateSolution({
      routes: initialBuckets,
      activeDrivers,
      referenceDistanceMeters: referenceDistance,
      config
    });

    // 7. Improvement Phase (Local Search: Moves, Swaps, 2-Opt)
    let currentBuckets: DriverBucket[] = initialBuckets.map(b => ({
      driver: b.driver,
      driverId: b.driverId,
      stops: [...b.stops],
      totalWeightKg: b.totalWeightKg,
      totalDistanceMeters: b.totalDistanceMeters,
      totalDurationSeconds: b.totalDurationSeconds
    }));

    let currentScore = initialEvaluation;
    let movesAccepted = 0;
    let swapsAccepted = 0;
    let twoOptTotal = 0;
    let iterationCount = 0;
    const maxSearchIterations = 40;
    let improvementFound = true;

    while (improvementFound && iterationCount < maxSearchIterations) {
      improvementFound = false;
      iterationCount++;

      // Try Move operators between pairs of drivers
      for (let i = 0; i < currentBuckets.length; i++) {
        for (let j = 0; j < currentBuckets.length; j++) {
          if (i === j) continue;

          const source = currentBuckets[i];
          const target = currentBuckets[j];

          if (source.stops.length === 0) continue;

          for (let sIdx = 0; sIdx < source.stops.length; sIdx++) {
            const stopToMove = source.stops[sIdx];
            const proposedTargetWeight = target.totalWeightKg + stopToMove.totalWeightKg;

            // Check hard 110% capacity constraint on target
            if (CapacityDomainService.canAssignWeight(target.driver, proposedTargetWeight)) {
              // Create candidate buckets
              const candSourceStops = source.stops.filter((_, idx) => idx !== sIdx);
              const candTargetStops = [...target.stops, stopToMove];

              const seqSource = RouteSequenceOptimizer.optimizeSequence(candSourceStops, locationIndexMap, matrix);
              const seqTarget = RouteSequenceOptimizer.optimizeSequence(candTargetStops, locationIndexMap, matrix);

              const candidateBuckets: DriverBucket[] = currentBuckets.map((b, bIdx) => {
                if (bIdx === i) {
                  return {
                    driver: b.driver,
                    driverId: b.driverId,
                    stops: [...seqSource.orderedStops],
                    totalWeightKg: b.totalWeightKg - stopToMove.totalWeightKg,
                    totalDistanceMeters: seqSource.distanceMeters,
                    totalDurationSeconds: seqSource.durationSeconds
                  };
                }
                if (bIdx === j) {
                  return {
                    driver: b.driver,
                    driverId: b.driverId,
                    stops: [...seqTarget.orderedStops],
                    totalWeightKg: b.totalWeightKg + stopToMove.totalWeightKg,
                    totalDistanceMeters: seqTarget.distanceMeters,
                    totalDurationSeconds: seqTarget.durationSeconds
                  };
                }
                return b;
              });

              const candScore = OptimizationEvaluationService.evaluateSolution({
                routes: candidateBuckets,
                activeDrivers,
                referenceDistanceMeters: referenceDistance,
                config
              });

              if (OptimizationEvaluationService.compareCandidateSolutions(candScore, currentScore) < 0) {
                currentBuckets = candidateBuckets;
                currentScore = candScore;
                movesAccepted++;
                twoOptTotal += seqSource.twoOptImprovements + seqTarget.twoOptImprovements;
                improvementFound = true;
                break;
              }
            }
          }
          if (improvementFound) break;
        }
        if (improvementFound) break;
      }

      // Try Swap operators between pairs of drivers
      if (!improvementFound) {
        for (let i = 0; i < currentBuckets.length - 1; i++) {
          for (let j = i + 1; j < currentBuckets.length; j++) {
            const bucketA = currentBuckets[i];
            const bucketB = currentBuckets[j];

            if (bucketA.stops.length === 0 || bucketB.stops.length === 0) continue;

            for (let aIdx = 0; aIdx < bucketA.stops.length; aIdx++) {
              for (let bIdx = 0; bIdx < bucketB.stops.length; bIdx++) {
                const stopA = bucketA.stops[aIdx];
                const stopB = bucketB.stops[bIdx];

                const newWeightA = bucketA.totalWeightKg - stopA.totalWeightKg + stopB.totalWeightKg;
                const newWeightB = bucketB.totalWeightKg - stopB.totalWeightKg + stopA.totalWeightKg;

                if (
                  CapacityDomainService.canAssignWeight(bucketA.driver, newWeightA) &&
                  CapacityDomainService.canAssignWeight(bucketB.driver, newWeightB)
                ) {
                  const candStopsA = bucketA.stops.map((s, idx) => (idx === aIdx ? stopB : s));
                  const candStopsB = bucketB.stops.map((s, idx) => (idx === bIdx ? stopA : s));

                  const seqA = RouteSequenceOptimizer.optimizeSequence(candStopsA, locationIndexMap, matrix);
                  const seqB = RouteSequenceOptimizer.optimizeSequence(candStopsB, locationIndexMap, matrix);

                  const candidateBuckets: DriverBucket[] = currentBuckets.map((b, idx) => {
                    if (idx === i) {
                      return {
                        driver: b.driver,
                        driverId: b.driverId,
                        stops: [...seqA.orderedStops],
                        totalWeightKg: newWeightA,
                        totalDistanceMeters: seqA.distanceMeters,
                        totalDurationSeconds: seqA.durationSeconds
                      };
                    }
                    if (idx === j) {
                      return {
                        driver: b.driver,
                        driverId: b.driverId,
                        stops: [...seqB.orderedStops],
                        totalWeightKg: newWeightB,
                        totalDistanceMeters: seqB.distanceMeters,
                        totalDurationSeconds: seqB.durationSeconds
                      };
                    }
                    return b;
                  });

                  const candScore = OptimizationEvaluationService.evaluateSolution({
                    routes: candidateBuckets,
                    activeDrivers,
                    referenceDistanceMeters: referenceDistance,
                    config
                  });

                  if (OptimizationEvaluationService.compareCandidateSolutions(candScore, currentScore) < 0) {
                    currentBuckets = candidateBuckets;
                    currentScore = candScore;
                    swapsAccepted++;
                    twoOptTotal += seqA.twoOptImprovements + seqB.twoOptImprovements;
                    improvementFound = true;
                    break;
                  }
                }
              }
              if (improvementFound) break;
            }
            if (improvementFound) break;
          }
          if (improvementFound) break;
        }
      }
    }

    // 8. Collect Unassigned Stops (Any stops that could not fit into fleet capacity)
    const assignedStopIdSet = new Set<string>();
    for (const b of currentBuckets) {
      for (const s of b.stops) {
        assignedStopIdSet.add(s.stopId);
      }
    }

    const unassignedStops: DeliveryStop[] = [
      ...oversizedStops,
      ...assignableStops.filter(s => !assignedStopIdSet.has(s.stopId))
    ];

    // 9. Build final Route domain entities
    const finalRoutes: Route[] = [];
    let totalAssignedDist = 0;
    let totalAssignedDur = 0;
    let totalAssignedWeight = 0;
    let usedDriversCount = 0;

    for (const bucket of currentBuckets) {
      if (bucket.stops.length > 0) {
        usedDriversCount++;
        totalAssignedDist += bucket.totalDistanceMeters;
        totalAssignedDur += bucket.totalDurationSeconds;
        totalAssignedWeight += bucket.totalWeightKg;

        const utilPercent = CapacityDomainService.getUtilization(bucket.driver, bucket.totalWeightKg);

        finalRoutes.push(new Route({
          driverId: bucket.driver.driverId,
          orderedStops: bucket.stops,
          totalWeightKg: bucket.totalWeightKg,
          utilizationPercent: utilPercent,
          totalDistanceMeters: bucket.totalDistanceMeters,
          totalDurationSeconds: bucket.totalDurationSeconds,
          polyline: undefined, // Final polyline calculated cleanly on demand
          isManuallyModified: false
        }));
      }
    }

    // 10. Compile Warnings and Alerts
    const warnings: DistributionWarning[] = [];
    if (oversizedStops.length > 0) {
      warnings.push({
        code: 'OVERSIZED_STOPS',
        message: `${oversizedStops.length} delivery stops exceed the maximum operational capacity of any active driver.`,
        messageKey: 'warnings.oversizedStop',
        params: { count: oversizedStops.length }
      });
    }

    if (unassignedStops.length > oversizedStops.length) {
      const remainingUnassignedCount = unassignedStops.length - oversizedStops.length;
      warnings.push({
        code: 'INSUFFICIENT_FLEET_CAPACITY',
        message: `${remainingUnassignedCount} stops could not be assigned due to fleet capacity constraints.`,
        messageKey: 'warnings.unassignedStops',
        params: { count: remainingUnassignedCount }
      });
    }

    // 11. Compile Optimization Metrics
    const metrics: OptimizationMetrics = {
      initialDistanceMeters: initialEvaluation.totalDistanceMeters,
      finalDistanceMeters: currentScore.totalDistanceMeters,
      initialLoadVariance: Math.round(initialEvaluation.loadDisparity * 100) / 100,
      finalLoadVariance: Math.round(currentScore.loadDisparity * 100) / 100,
      finalOptimizationScore: Math.round(currentScore.finalScore * 1000) / 1000,
      totalDurationSeconds: totalAssignedDur,
      iterationCount,
      executionDurationMs: Math.round(performance.now() - startTime),
      activeDriversUsed: usedDriversCount
    };

    const finalResult = new DistributionResult({
      routes: finalRoutes,
      unassignedStops,
      oversizedStops,
      warnings,
      totalDistanceMeters: totalAssignedDist,
      totalDurationSeconds: totalAssignedDur,
      totalWeightKg: totalAssignedWeight,
      driversUsed: usedDriversCount,
      metrics
    });

    // 12. Final Distribution Invariant Verification
    const invariantCheck = DistributionInvariantValidator.validate(
      finalResult,
      activeDrivers,
      depot,
      matrix
    );

    if (!invariantCheck.isValid) {
      const firstViolation = invariantCheck.violations[0];
      throw new Error(`Optimization invariant failed [${firstViolation.invariant}]: ${firstViolation.message}`);
    }

    return finalResult;
  }

  /**
   * Generates a deterministic initial feasible assignment using Distance-Savings & Capacity-Aware construction.
   */
  private generateInitialSolution(
    stops: readonly DeliveryStop[],
    activeDrivers: readonly Driver[],
    locationIndexMap: Map<string, number>,
    matrix: RouteMatrix
  ): DriverBucket[] {
    const buckets: DriverBucket[] = activeDrivers.map(d => ({
      driver: d,
      driverId: d.driverId,
      stops: [],
      totalWeightKg: 0,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0
    }));

    // Sort stops deterministically: primary by distance from depot descending (farthest first), secondary by weight descending
    const depotIdx = locationIndexMap.get('DEPOT')!;
    const sortedStops = [...stops].sort((a, b) => {
      const aIdx = locationIndexMap.get(a.stopId)!;
      const bIdx = locationIndexMap.get(b.stopId)!;

      const distA = matrix.elements[depotIdx]?.[aIdx]?.distanceMeters ?? 0;
      const distB = matrix.elements[depotIdx]?.[bIdx]?.distanceMeters ?? 0;

      if (distB !== distA) {
        return distB - distA; // Farthest first
      }

      if (b.totalWeightKg !== a.totalWeightKg) {
        return b.totalWeightKg - a.totalWeightKg; // Heaviest first
      }

      return a.stopId.localeCompare(b.stopId); // Stable ID tie-breaker
    });

    // Assign each stop to the most suitable driver (closest marginal distance increase within 110% capacity)
    for (const stop of sortedStops) {
      const stopIdx = locationIndexMap.get(stop.stopId)!;
      let bestBucketIdx = -1;
      let minMarginalCost = Infinity;

      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        const proposedWeight = bucket.totalWeightKg + stop.totalWeightKg;

        if (CapacityDomainService.canAssignWeight(bucket.driver, proposedWeight)) {
          let marginalDist = 0;
          if (bucket.stops.length === 0) {
            // First stop: Depot -> Stop -> Depot
            const dToS = matrix.elements[depotIdx]?.[stopIdx]?.distanceMeters ?? 0;
            const sToD = matrix.elements[stopIdx]?.[depotIdx]?.distanceMeters ?? 0;
            marginalDist = dToS + sToD;
          } else {
            // Find best insertion position in current route
            let bestInsertionCost = Infinity;
            const path = ['DEPOT', ...bucket.stops.map(s => s.stopId), 'DEPOT'];

            for (let p = 0; p < path.length - 1; p++) {
              const uId = path[p];
              const vId = path[p + 1];
              const uIdx = locationIndexMap.get(uId)!;
              const vIdx = locationIndexMap.get(vId)!;

              const dUV = matrix.elements[uIdx]?.[vIdx]?.distanceMeters ?? 0;
              const dUS = matrix.elements[uIdx]?.[stopIdx]?.distanceMeters ?? 0;
              const dSV = matrix.elements[stopIdx]?.[vIdx]?.distanceMeters ?? 0;

              const cost = dUS + dSV - dUV;
              if (cost < bestInsertionCost) {
                bestInsertionCost = cost;
              }
            }
            marginalDist = bestInsertionCost;
          }

          // Construction Heuristic: pure best-insertion road distance under hard 110% capacity constraint.
          // Objective evaluation (70% Distance + 30% Load Balance) is strictly decoupled and applied
          // during the objective evaluation and local search acceptance phases.
          const insertionCost = marginalDist;

          if (
            insertionCost < minMarginalCost ||
            (insertionCost === minMarginalCost && proposedWeight < (buckets[bestBucketIdx]?.totalWeightKg ?? Infinity))
          ) {
            minMarginalCost = insertionCost;
            bestBucketIdx = i;
          }
        }
      }

      if (bestBucketIdx !== -1) {
        const targetBucket = buckets[bestBucketIdx];
        targetBucket.stops.push(stop);
        targetBucket.totalWeightKg += stop.totalWeightKg;
      }
    }

    return buckets;
  }
}
