import { OptimizationConfig } from '../value-objects/OptimizationConfig';
import { Driver } from '../entities/Driver';
import { DeliveryStop } from '../entities/DeliveryStop';
import { RouteMatrix } from '../../application/ports/IRoutingService';
import { CapacityDomainService } from './CapacityDomainService';

export interface ObjectiveEvaluationInput {
  readonly routes: readonly {
    readonly driverId: string;
    readonly orderedStops?: readonly DeliveryStop[];
    readonly stops?: readonly DeliveryStop[];
    readonly totalWeightKg: number;
    readonly totalDistanceMeters: number;
    readonly totalDurationSeconds: number;
  }[];
  readonly activeDrivers: readonly Driver[];
  readonly referenceDistanceMeters: number;
  readonly config: OptimizationConfig;
}

export interface ObjectiveScoreBreakdown {
  readonly totalDistanceMeters: number;
  readonly normalizedDistance: number;
  readonly loadDisparity: number;
  readonly normalizedLoadBalance: number;
  readonly distanceComponent: number;     // e.g. 0.70 * normalizedDistance
  readonly loadBalanceComponent: number;  // e.g. 0.30 * normalizedLoadBalance
  readonly finalScore: number;            // distanceComponent + loadBalanceComponent
  readonly usedDriversCount: number;
}

export class OptimizationEvaluationService {
  /**
   * Calculates the exact road distance and duration for an ordered sequence of stops
   * from DEPOT -> Stop 1 -> Stop 2 -> ... -> Stop N -> DEPOT using the RouteMatrix.
   */
  public static calculateRouteMetricsFromMatrix(
    stopIds: readonly string[],
    locationIndexMap: Map<string, number>,
    matrix: RouteMatrix
  ): { distanceMeters: number; durationSeconds: number } {
    if (stopIds.length === 0) {
      return { distanceMeters: 0, durationSeconds: 0 };
    }

    const path = ['DEPOT', ...stopIds, 'DEPOT'];
    let distanceMeters = 0;
    let durationSeconds = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const fromId = path[i];
      const toId = path[i + 1];

      const fromIdx = locationIndexMap.get(fromId);
      const toIdx = locationIndexMap.get(toId);

      if (fromIdx === undefined || toIdx === undefined) {
        throw new Error(`Location '${fromId}' or '${toId}' not found in RouteMatrix.`);
      }

      const elem = matrix.elements[fromIdx]?.[toIdx];
      if (!elem || elem.status !== 'OK') {
        throw new Error(`Missing or invalid matrix element from '${fromId}' to '${toId}'.`);
      }

      distanceMeters += elem.distanceMeters;
      durationSeconds += elem.durationSeconds;
    }

    return { distanceMeters, durationSeconds };
  }

  /**
   * Evaluates the 70% Distance + 30% Load Balancing composite objective function.
   *
   * 1. Distance Component (70%):
   *    normalizedDistance = totalDistance / referenceDistance
   *    (lower is better)
   *
   * 2. Load Balance Component (30%):
   *    Evaluated across used active drivers based on utilization ratio against nominal capacity:
   *    utilization_i = routeWeight_i / maximumLoadKg_i
   *    disparity = max(utilization) - min(utilization) + variance(utilization)
   *    normalized to [0, 1] range.
   *    If 0 or 1 driver is used, disparity is 0.
   *
   * 3. Composite Objective:
   *    finalScore = (distanceWeight * normalizedDistance) + (loadBalanceWeight * normalizedLoadBalance)
   *    (Lower score = better solution)
   */
  public static evaluateSolution(input: ObjectiveEvaluationInput): ObjectiveScoreBreakdown {
    const { routes, activeDrivers, referenceDistanceMeters, config } = input;
    const driverMap = new Map<string, Driver>();
    for (const d of activeDrivers) {
      driverMap.set(d.driverId, d);
    }

    let totalDistanceMeters = 0;
    const activeUsedRoutes = routes.filter(r => (r.orderedStops?.length ?? r.stops?.length ?? 0) > 0);
    const usedDriversCount = activeUsedRoutes.length;

    for (const r of activeUsedRoutes) {
      totalDistanceMeters += r.totalDistanceMeters;
    }

    // 1. Distance Normalization
    const refDist = referenceDistanceMeters > 0 ? referenceDistanceMeters : Math.max(totalDistanceMeters, 1);
    const normalizedDistance = totalDistanceMeters / refDist;

    // 2. Load Balance Calculation
    // Utilization is calculated against driver's nominal capacity (maximumLoadKg), NOT 110%
    let normalizedLoadBalance = 0;
    let loadDisparity = 0;

    if (usedDriversCount > 1) {
      const utilizations: number[] = [];
      for (const r of activeUsedRoutes) {
        const driver = driverMap.get(r.driverId);
        const nominal = driver ? driver.maximumLoadKg : 1000;
        const util = (r.totalWeightKg / nominal); // e.g. 1.0 = 100% nominal
        utilizations.push(util);
      }

      const maxUtil = Math.max(...utilizations);
      const minUtil = Math.min(...utilizations);
      const meanUtil = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
      
      const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - meanUtil, 2), 0) / utilizations.length;
      const stdDev = Math.sqrt(variance);

      // Disparity combines range spread and standard deviation
      loadDisparity = (maxUtil - minUtil) + stdDev;

      // Bounded normalization: 0 means perfectly balanced, 1 means max plausible disparity (e.g. 1.10)
      normalizedLoadBalance = Math.min(Math.max(loadDisparity / 1.10, 0), 2.0);
    } else {
      normalizedLoadBalance = 0;
      loadDisparity = 0;
    }

    const distanceComponent = config.distanceWeight * normalizedDistance;
    const loadBalanceComponent = config.loadBalanceWeight * normalizedLoadBalance;
    const finalScore = distanceComponent + loadBalanceComponent;

    return {
      totalDistanceMeters,
      normalizedDistance,
      loadDisparity,
      normalizedLoadBalance,
      distanceComponent,
      loadBalanceComponent,
      finalScore,
      usedDriversCount
    };
  }

  /**
   * Deterministic Tie-Breaker Comparison between two valid candidate solutions.
   * Order:
   * 1. lower final objective score (within epsilon 1e-6)
   * 2. lower total road distance
   * 3. lower load disparity
   * 4. fewer used drivers
   * 5. stable deterministic hash / driver IDs
   */
  public static compareCandidateSolutions(
    scoreA: ObjectiveScoreBreakdown,
    scoreB: ObjectiveScoreBreakdown
  ): number {
    const EPSILON = 1e-6;
    if (Math.abs(scoreA.finalScore - scoreB.finalScore) > EPSILON) {
      return scoreA.finalScore - scoreB.finalScore;
    }

    if (scoreA.totalDistanceMeters !== scoreB.totalDistanceMeters) {
      return scoreA.totalDistanceMeters - scoreB.totalDistanceMeters;
    }

    if (Math.abs(scoreA.loadDisparity - scoreB.loadDisparity) > EPSILON) {
      return scoreA.loadDisparity - scoreB.loadDisparity;
    }

    if (scoreA.usedDriversCount !== scoreB.usedDriversCount) {
      return scoreA.usedDriversCount - scoreB.usedDriversCount;
    }

    return 0;
  }
}
