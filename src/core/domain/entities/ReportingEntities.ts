import { ApprovedDistribution } from './ApprovedDistribution';
import { ValidationError } from '../errors/DomainErrors';

export type ReportPeriodPreset = 'today' | '7days' | '30days' | 'custom';

export type HistoryDatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export interface DistributionHistoryFilter {
  readonly datePreset?: HistoryDatePreset;
  readonly startDate?: string; // YYYY-MM-DD
  readonly endDate?: string;   // YYYY-MM-DD
  readonly driverId?: string;
  readonly revision?: number;
  readonly distributionId?: string;
  readonly status?: string;
}

export interface ReportFilter {
  readonly periodPreset?: ReportPeriodPreset;
  readonly datePreset?: string;
  readonly startDate?: string; // YYYY-MM-DD
  readonly endDate?: string;   // YYYY-MM-DD
  readonly driverId?: string;
  readonly revision?: number;
}

export interface OperationalMetrics {
  readonly totalDistributions: number;
  readonly totalDeliveredWeightKg: number;
  readonly totalAssignedWeightKg: number;
  readonly totalDistanceMeters: number;
  readonly totalDrivingTimeSeconds: number;
  readonly averageDistancePerDriverMeters: number;
  readonly averageLoadUtilizationPercent: number;
  readonly averageStopsPerDriver: number;
  readonly unassignedStopRatePercent: number;
  readonly averageOptimizationScore: number;
  readonly unassignedStopCount: number;
  readonly unassignedWeightKg: number;
  readonly unassignedListCount: number;
}

export interface DriverPerformanceMetrics {
  readonly driverId: string;
  readonly driverName: string;
  readonly distributionCount: number;
  readonly routeCount: number;
  readonly totalStops: number;
  readonly totalWeightKg: number;
  readonly totalDistanceMeters: number;
  readonly totalDrivingTimeSeconds: number;
  readonly averageUtilizationPercent: number;
  readonly averageStopsPerRoute: number;
  readonly averageDistancePerRouteMeters: number;
}

export interface DistributionComparisonResult {
  readonly baseDistributionId: string;
  readonly baseRevision: number;
  readonly targetDistributionId: string;
  readonly targetRevision: number;

  // Base snapshot metrics
  readonly baseMetrics: {
    readonly totalDistanceMeters: number;
    readonly totalDurationSeconds: number;
    readonly totalWeightKg: number;
    readonly driversUsed: number;
    readonly stopsCount: number;
    readonly unassignedCount: number;
    readonly optimizationScore: number;
    readonly averageUtilizationPercent: number;
  };

  // Target snapshot metrics
  readonly targetMetrics: {
    readonly totalDistanceMeters: number;
    readonly totalDurationSeconds: number;
    readonly totalWeightKg: number;
    readonly driversUsed: number;
    readonly stopsCount: number;
    readonly unassignedCount: number;
    readonly optimizationScore: number;
    readonly averageUtilizationPercent: number;
  };

  // Difference: Target minus Base
  readonly differences: {
    readonly distanceDifferenceMeters: number;
    readonly durationDifferenceSeconds: number;
    readonly scoreDifference: number;
    readonly weightDifferenceKg: number;
    readonly driversDifference: number;
    readonly stopsDifference: number;
    readonly unassignedDifference: number;
    readonly utilizationDifferencePercent: number;
  };
}

/**
 * Pure domain calculation service for historical reports and metrics
 * Guarantees zero double counting and maintains physical buyer stop atomicity.
 */
export class ReportingDomainService {
  /**
   * Resolves a calendar date preset into exact ISO start and end timestamp boundaries.
   * Ensures true calendar month/week boundaries rather than arbitrary rolling windows.
   */
  public static resolveCalendarDateRange(
    preset?: string,
    referenceDate: Date = new Date()
  ): { startDate?: string; endDate?: string } {
    if (!preset || preset === 'all') {
      return {};
    }

    const ref = new Date(referenceDate);

    switch (preset) {
      case 'today': {
        const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
        const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'yesterday': {
        const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1, 0, 0, 0, 0);
        const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1, 23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'this_week': {
        // Start of current week (Sunday 00:00:00.000) to end of current day
        const dayOfWeek = ref.getDay(); // 0 = Sunday
        const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dayOfWeek, 0, 0, 0, 0);
        const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'this_month': {
        // From 1st day of current month at 00:00:00.000 to end of current day
        const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'last_month': {
        // 1st of previous month to last day of previous month
        const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1, 0, 0, 0, 0);
        const lastDayOfPrevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0, 23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: lastDayOfPrevMonth.toISOString() };
      }
      case 'last_7_days': {
        const start = new Date(ref.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString(), endDate: ref.toISOString() };
      }
      case 'last_30_days':
      case '30days': {
        const start = new Date(ref.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString(), endDate: ref.toISOString() };
      }
      default: {
        return {};
      }
    }
  }

  /**
   * Computes operational metrics across a collection of approved distribution snapshots.
   * If driverId filter is provided, calculates strictly for routes assigned to that driver.
   */
  public static calculateOperationalMetrics(
    distributions: readonly ApprovedDistribution[],
    filter?: ReportFilter
  ): OperationalMetrics {
    if (!distributions || distributions.length === 0) {
      return {
        totalDistributions: 0,
        totalDeliveredWeightKg: 0,
        totalAssignedWeightKg: 0,
        totalDistanceMeters: 0,
        totalDrivingTimeSeconds: 0,
        averageDistancePerDriverMeters: 0,
        averageLoadUtilizationPercent: 0,
        averageStopsPerDriver: 0,
        unassignedStopRatePercent: 0,
        averageOptimizationScore: 0,
        unassignedStopCount: 0,
        unassignedWeightKg: 0,
        unassignedListCount: 0
      };
    }

    let totalDeliveredWeight = 0;
    let totalAssignedWeight = 0;
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let totalActiveDriverRoutes = 0;
    let totalStopsAssigned = 0;
    let totalUtilizationSum = 0;
    let totalOptimizationScoreSum = 0;
    let totalUnassignedStops = 0;
    let totalUnassignedWeight = 0;
    let totalUnassignedLists = 0;
    let totalGlobalStopsCount = 0;

    const filteredDistributions = filter?.revision
      ? distributions.filter(d => d.revision === filter.revision)
      : distributions;

    let evaluatedDistributionCount = 0;

    for (const dist of filteredDistributions) {
      evaluatedDistributionCount++;
      totalOptimizationScoreSum += dist.optimizationScore;

      // Filter routes by driver if requested
      const relevantRoutes = filter?.driverId
        ? dist.routes.filter(r => r.driverId === filter.driverId)
        : dist.routes;

      for (const route of relevantRoutes) {
        totalActiveDriverRoutes++;
        totalDeliveredWeight += route.totalWeightKg;
        totalDistanceMeters += route.totalDistanceMeters;
        totalDurationSeconds += route.totalDurationSeconds;
        totalUtilizationSum += route.utilizationPercent;
        const stopCount = route.orderedStops ? route.orderedStops.length : ((route as any).stops?.length || 0);
        totalStopsAssigned += stopCount;
      }

      // Unassigned stats are computed from the snapshot
      // (If driver filter is active, unassigned are not attributed to any specific driver)
      if (!filter?.driverId) {
        totalAssignedWeight += dist.routes.reduce((acc, r) => acc + r.totalWeightKg, 0);
        totalUnassignedStops += dist.unassigned.length;
        totalUnassignedWeight += dist.unassigned.reduce((acc, u) => acc + u.totalWeightKg, 0);
        totalUnassignedLists += dist.unassigned.reduce(
          (acc, u) => acc + (u.lists ? u.lists.length : ((u as any).listNumbers?.length || 0)),
          0
        );
        totalGlobalStopsCount += dist.stops.length;
      } else {
        totalAssignedWeight += totalDeliveredWeight;
      }
    }

    const avgDistancePerDriver = totalActiveDriverRoutes > 0
      ? Math.round(totalDistanceMeters / totalActiveDriverRoutes)
      : 0;

    const avgUtilization = totalActiveDriverRoutes > 0
      ? Math.round((totalUtilizationSum / totalActiveDriverRoutes) * 100) / 100
      : 0;

    const avgStopsPerDriver = totalActiveDriverRoutes > 0
      ? Math.round((totalStopsAssigned / totalActiveDriverRoutes) * 10) / 10
      : 0;

    const unassignedRate = totalGlobalStopsCount > 0
      ? Math.round((totalUnassignedStops / totalGlobalStopsCount) * 10000) / 100
      : 0;

    const avgOptimizationScore = evaluatedDistributionCount > 0
      ? Math.round((totalOptimizationScoreSum / evaluatedDistributionCount) * 100) / 100
      : 0;

    return {
      totalDistributions: evaluatedDistributionCount,
      totalDeliveredWeightKg: Math.round(totalDeliveredWeight * 100) / 100,
      totalAssignedWeightKg: Math.round(totalAssignedWeight * 100) / 100,
      totalDistanceMeters,
      totalDrivingTimeSeconds: totalDurationSeconds,
      averageDistancePerDriverMeters: avgDistancePerDriver,
      averageLoadUtilizationPercent: avgUtilization,
      averageStopsPerDriver: avgStopsPerDriver,
      unassignedStopRatePercent: unassignedRate,
      averageOptimizationScore: avgOptimizationScore,
      unassignedStopCount: totalUnassignedStops,
      unassignedWeightKg: Math.round(totalUnassignedWeight * 100) / 100,
      unassignedListCount: totalUnassignedLists
    };
  }

  /**
   * Computes driver performance metrics aggregated across historical snapshots
   */
  public static calculateDriverPerformance(
    distributions: readonly ApprovedDistribution[],
    targetDriverId?: string
  ): DriverPerformanceMetrics[] {
    const driverStatsMap = new Map<string, {
      driverName: string;
      distributionIds: Set<string>;
      routeCount: number;
      totalStops: number;
      totalWeightKg: number;
      totalDistanceMeters: number;
      totalDurationSeconds: number;
      utilizationSum: number;
    }>();

    for (const dist of distributions) {
      for (const route of dist.routes) {
        if (targetDriverId && route.driverId !== targetDriverId) {
          continue;
        }

        const driverMeta = dist.drivers.find(d => d.driverId === route.driverId);
        const driverName = driverMeta?.driverName || route.driverId;

        let entry = driverStatsMap.get(route.driverId);
        if (!entry) {
          entry = {
            driverName,
            distributionIds: new Set(),
            routeCount: 0,
            totalStops: 0,
            totalWeightKg: 0,
            totalDistanceMeters: 0,
            totalDurationSeconds: 0,
            utilizationSum: 0
          };
          driverStatsMap.set(route.driverId, entry);
        }

        entry.distributionIds.add(dist.distributionId);
        entry.routeCount += 1;
        const stopCount = route.orderedStops.length;
        entry.totalStops += stopCount;
        entry.totalWeightKg += route.totalWeightKg;
        entry.totalDistanceMeters += route.totalDistanceMeters;
        entry.totalDurationSeconds += route.totalDurationSeconds;
        const routeUtil = typeof route.utilizationPercent === 'number'
          ? route.utilizationPercent
          : (driverMeta?.maximumLoadKg ? (route.totalWeightKg / driverMeta.maximumLoadKg) * 100 : 0);
        entry.utilizationSum += routeUtil;
      }
    }

    const results: DriverPerformanceMetrics[] = [];

    for (const [driverId, entry] of driverStatsMap.entries()) {
      const avgUtilization = entry.routeCount > 0
        ? Math.round((entry.utilizationSum / entry.routeCount) * 100) / 100
        : 0;
      const avgStops = entry.routeCount > 0
        ? Math.round((entry.totalStops / entry.routeCount) * 10) / 10
        : 0;
      const avgDistance = entry.routeCount > 0
        ? Math.round(entry.totalDistanceMeters / entry.routeCount)
        : 0;

      results.push({
        driverId,
        driverName: entry.driverName,
        distributionCount: entry.distributionIds.size,
        routeCount: entry.routeCount,
        totalStops: entry.totalStops,
        totalWeightKg: Math.round(entry.totalWeightKg * 100) / 100,
        totalDistanceMeters: entry.totalDistanceMeters,
        totalDrivingTimeSeconds: entry.totalDurationSeconds,
        averageUtilizationPercent: avgUtilization,
        averageStopsPerRoute: avgStops,
        averageDistancePerRouteMeters: avgDistance
      });
    }

    // Sort by driver name
    return results.sort((a, b) => a.driverName.localeCompare(b.driverName));
  }

  /**
   * Compares two approved distributions and produces mathematical delta analysis.
   * Throws ValidationError if comparing identical revisions.
   */
  public static compareDistributions(
    base: ApprovedDistribution,
    target: ApprovedDistribution
  ): DistributionComparisonResult {
    if (base.distributionId === target.distributionId && base.revision === target.revision) {
      throw new ValidationError(
        'Cannot compare a distribution snapshot to itself.',
        'validation.sameRevisionComparisonRejected',
        { distributionId: base.distributionId, revision: base.revision }
      );
    }

    const baseDistance = base.routes.reduce((sum, r) => sum + r.totalDistanceMeters, 0) || (base.metrics?.finalDistanceMeters ?? 0);
    const targetDistance = target.routes.reduce((sum, r) => sum + r.totalDistanceMeters, 0) || (target.metrics?.finalDistanceMeters ?? 0);

    const baseDuration = base.routes.reduce((sum, r) => sum + r.totalDurationSeconds, 0) || (base.metrics?.totalDurationSeconds ?? 0);
    const targetDuration = target.routes.reduce((sum, r) => sum + r.totalDurationSeconds, 0) || (target.metrics?.totalDurationSeconds ?? 0);

    const baseWeight = base.routes.reduce((sum, r) => sum + r.totalWeightKg, 0);
    const targetWeight = target.routes.reduce((sum, r) => sum + r.totalWeightKg, 0);

    const baseStops = base.routes.reduce((sum, r) => sum + r.orderedStops.length, 0);
    const targetStops = target.routes.reduce((sum, r) => sum + r.orderedStops.length, 0);

    const baseUtilization = base.routes.length > 0
      ? base.routes.reduce((sum, r) => sum + r.utilizationPercent, 0) / base.routes.length
      : 0;
    const targetUtilization = target.routes.length > 0
      ? target.routes.reduce((sum, r) => sum + r.utilizationPercent, 0) / target.routes.length
      : 0;

    return {
      baseDistributionId: base.distributionId,
      baseRevision: base.revision,
      targetDistributionId: target.distributionId,
      targetRevision: target.revision,

      baseMetrics: {
        totalDistanceMeters: baseDistance,
        totalDurationSeconds: baseDuration,
        totalWeightKg: Math.round(baseWeight * 100) / 100,
        driversUsed: base.routes.length,
        stopsCount: baseStops,
        unassignedCount: base.unassigned.length,
        optimizationScore: base.optimizationScore,
        averageUtilizationPercent: Math.round(baseUtilization * 100) / 100
      },

      targetMetrics: {
        totalDistanceMeters: targetDistance,
        totalDurationSeconds: targetDuration,
        totalWeightKg: Math.round(targetWeight * 100) / 100,
        driversUsed: target.routes.length,
        stopsCount: targetStops,
        unassignedCount: target.unassigned.length,
        optimizationScore: target.optimizationScore,
        averageUtilizationPercent: Math.round(targetUtilization * 100) / 100
      },

      differences: {
        distanceDifferenceMeters: targetDistance - baseDistance,
        durationDifferenceSeconds: targetDuration - baseDuration,
        scoreDifference: Math.round((target.optimizationScore - base.optimizationScore) * 1000) / 1000,
        weightDifferenceKg: Math.round((targetWeight - baseWeight) * 100) / 100,
        driversDifference: target.routes.length - base.routes.length,
        stopsDifference: targetStops - baseStops,
        unassignedDifference: target.unassigned.length - base.unassigned.length,
        utilizationDifferencePercent: Math.round((targetUtilization - baseUtilization) * 100) / 100
      }
    };
  }
}
