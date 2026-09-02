import { Route } from '../../../domain/entities/Route';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { Driver } from '../../../domain/entities/Driver';
import { DistributionResult } from '../../../domain/entities/DistributionResult';
import { CapacityDomainService } from '../../../domain/services/CapacityDomainService';
import { RouteSequenceOptimizer } from '../../../domain/services/RouteSequenceOptimizer';
import { OptimizationEvaluationService } from '../../../domain/services/OptimizationEvaluationService';
import { DistributionInvariantValidator } from '../../../domain/services/DistributionValidator';
import { RouteMatrix } from '../../ports/IRoutingService';
import { Depot } from '../../../domain/entities/Depot';
import { OptimizationConfig } from '../../../domain/value-objects/OptimizationConfig';
import { CapacityExceededError, ValidationError } from '../../../domain/errors/DomainErrors';

export interface ManualReassignmentRequest {
  readonly currentDistribution: DistributionResult;
  readonly stopId: string;
  readonly targetDriverId: string | 'UNASSIGNED';
  readonly activeDrivers: readonly Driver[];
  readonly depot: Depot;
  readonly matrix: RouteMatrix;
  readonly config?: OptimizationConfig;
}

export class ReassignStopUseCase {
  public execute(request: ManualReassignmentRequest): DistributionResult {
    const { currentDistribution, stopId, targetDriverId, activeDrivers, depot, matrix, config } = request;
    const optConfig = config || new OptimizationConfig();

    const locationIndexMap = new Map<string, number>();
    matrix.origins.forEach((loc, idx) => locationIndexMap.set(loc.id, idx));

    // 1. Locate the target stop across current routes or unassigned lists
    let targetStop: DeliveryStop | null = null;
    let sourceDriverId: string | 'UNASSIGNED' | null = null;

    for (const r of currentDistribution.routes) {
      const found = r.orderedStops.find(s => s.stopId === stopId);
      if (found) {
        targetStop = found;
        sourceDriverId = r.driverId;
        break;
      }
    }

    if (!targetStop) {
      const foundUnassigned = currentDistribution.unassignedStops.find(s => s.stopId === stopId);
      if (foundUnassigned) {
        targetStop = foundUnassigned;
        sourceDriverId = 'UNASSIGNED';
      }
    }

    if (!targetStop || !sourceDriverId) {
      throw new ValidationError(`Delivery stop '${stopId}' was not found in current distribution.`);
    }

    // If source and target are the same, return unchanged
    if (sourceDriverId === targetDriverId) {
      return currentDistribution;
    }

    const activeDriverMap = new Map<string, Driver>();
    for (const d of activeDrivers) {
      if (d.active) {
        activeDriverMap.set(d.driverId, d);
      }
    }

    // 2. Build mutable working driver buckets
    const driverBuckets = activeDrivers.filter(d => d.active).map(d => {
      const existingRoute = currentDistribution.routes.find(r => r.driverId === d.driverId);
      return {
        driver: d,
        stops: existingRoute ? [...existingRoute.orderedStops] : [],
        isManuallyModified: existingRoute ? existingRoute.isManuallyModified : false
      };
    });

    let workingUnassigned = [...currentDistribution.unassignedStops];

    // Remove stop from source
    if (sourceDriverId === 'UNASSIGNED') {
      workingUnassigned = workingUnassigned.filter(s => s.stopId !== stopId);
    } else {
      const srcBucket = driverBuckets.find(b => b.driver.driverId === sourceDriverId);
      if (srcBucket) {
        srcBucket.stops = srcBucket.stops.filter(s => s.stopId !== stopId);
        srcBucket.isManuallyModified = true;
      }
    }

    // Add stop to target
    if (targetDriverId === 'UNASSIGNED') {
      workingUnassigned.push(targetStop);
    } else {
      const tgtBucket = driverBuckets.find(b => b.driver.driverId === targetDriverId);
      if (!tgtBucket) {
        throw new ValidationError(`Target driver '${targetDriverId}' is not an active driver in the fleet.`);
      }

      const projectedWeight = tgtBucket.stops.reduce((sum, s) => sum + s.totalWeightKg, 0) + targetStop.totalWeightKg;
      const maxAllowed = CapacityDomainService.getMaximumAllowedCapacity(tgtBucket.driver);

      if (projectedWeight > maxAllowed) {
        throw new CapacityExceededError(targetDriverId, projectedWeight, maxAllowed);
      }

      tgtBucket.stops.push(targetStop);
      tgtBucket.isManuallyModified = true;
    }

    // 3. Re-sequence and recalculate metrics for all active driver routes
    const updatedRoutes: Route[] = [];
    let totalDist = 0;
    let totalDur = 0;
    let totalWeight = 0;
    let usedDriversCount = 0;

    for (const bucket of driverBuckets) {
      if (bucket.stops.length > 0) {
        usedDriversCount++;
        const seq = RouteSequenceOptimizer.optimizeSequence(
          bucket.stops,
          locationIndexMap,
          matrix
        );

        const routeWeight = bucket.stops.reduce((sum, s) => sum + s.totalWeightKg, 0);
        const utilPercent = CapacityDomainService.getUtilization(bucket.driver, routeWeight);

        totalDist += seq.distanceMeters;
        totalDur += seq.durationSeconds;
        totalWeight += routeWeight;

        updatedRoutes.push(new Route({
          driverId: bucket.driver.driverId,
          orderedStops: seq.orderedStops,
          totalWeightKg: Math.round(routeWeight * 100) / 100,
          utilizationPercent: utilPercent,
          totalDistanceMeters: seq.distanceMeters,
          totalDurationSeconds: seq.durationSeconds,
          polyline: undefined,
          isManuallyModified: bucket.isManuallyModified
        }));
      }
    }

    const evaluation = OptimizationEvaluationService.evaluateSolution({
      routes: updatedRoutes.map(r => ({
        driverId: r.driverId,
        orderedStops: r.orderedStops,
        totalWeightKg: r.totalWeightKg,
        totalDistanceMeters: r.totalDistanceMeters,
        totalDurationSeconds: r.totalDurationSeconds
      })),
      activeDrivers: activeDrivers.filter(d => d.active),
      referenceDistanceMeters: Math.max(totalDist, 10000),
      config: optConfig
    });

    const finalResult = new DistributionResult({
      routes: updatedRoutes,
      unassignedStops: workingUnassigned,
      oversizedStops: currentDistribution.oversizedStops,
      warnings: currentDistribution.warnings,
      totalDistanceMeters: totalDist,
      totalDurationSeconds: totalDur,
      totalWeightKg: totalWeight,
      driversUsed: usedDriversCount,
      metrics: {
        initialDistanceMeters: currentDistribution.metrics?.initialDistanceMeters ?? totalDist,
        finalDistanceMeters: totalDist,
        initialLoadVariance: currentDistribution.metrics?.initialLoadVariance ?? 0,
        finalLoadVariance: Math.round(evaluation.loadDisparity * 100) / 100,
        finalOptimizationScore: Math.round(evaluation.finalScore * 1000) / 1000,
        totalDurationSeconds: totalDur,
        iterationCount: currentDistribution.metrics?.iterationCount ?? 0,
        executionDurationMs: currentDistribution.metrics?.executionDurationMs ?? 0,
        activeDriversUsed: usedDriversCount
      }
    });

    const invariantCheck = DistributionInvariantValidator.validate(
      finalResult,
      activeDrivers,
      depot,
      matrix
    );

    if (!invariantCheck.isValid) {
      const violation = invariantCheck.violations[0];
      throw new Error(`Manual reassignment violated invariant [${violation.invariant}]: ${violation.message}`);
    }

    return finalResult;
  }
}
