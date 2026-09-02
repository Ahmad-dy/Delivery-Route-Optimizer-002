import { IOptimizationService, OptimizationRequest } from '../../application/ports/IOptimizationService';
import { DistributionResult } from '../../domain/entities/DistributionResult';
import { Route } from '../../domain/entities/Route';
import { DeliveryStop } from '../../domain/entities/DeliveryStop';
import { CapacityDomainService } from '../../domain/services/CapacityDomainService';

export class MockOptimizationAdapter implements IOptimizationService {
  /**
   * Mock optimization adapter adhering to the Stage 2 contract without executing real heuristics.
   * Performs basic contract validation and returns structured DistributionResult.
   */
  public async optimize(request: OptimizationRequest): Promise<DistributionResult> {
    const { stops, drivers } = request;
    const activeDrivers = drivers.filter(d => d.active);

    const routes: Route[] = [];
    const unassignedStops: DeliveryStop[] = [];
    const oversizedStops: DeliveryStop[] = [];

    // Trivial round-robin partition for contract testing
    if (activeDrivers.length === 0) {
      return new DistributionResult({
        routes: [],
        unassignedStops: [...stops],
        oversizedStops: [],
        warnings: [{
          code: 'NO_ACTIVE_DRIVERS',
          message: 'No active drivers available in fleet.',
          messageKey: 'warnings.noActiveDrivers'
        }],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        totalWeightKg: stops.reduce((sum, s) => sum + s.totalWeightKg, 0),
        driversUsed: 0
      });
    }

    const driverBuckets: Map<string, { stops: DeliveryStop[]; weight: number }> = new Map();
    for (const d of activeDrivers) {
      driverBuckets.set(d.driverId, { stops: [], weight: 0 });
    }

    let driverIdx = 0;
    for (const stop of stops) {
      const driver = activeDrivers[driverIdx % activeDrivers.length];
      const bucket = driverBuckets.get(driver.driverId)!;
      const proposedWeight = bucket.weight + stop.totalWeightKg;

      if (CapacityDomainService.canAssignWeight(driver, proposedWeight)) {
        bucket.stops.push(stop);
        bucket.weight += stop.totalWeightKg;
      } else {
        unassignedStops.push(stop);
      }
      driverIdx++;
    }

    let totalDist = 0;
    let totalDur = 0;
    let totalAssignedWeight = 0;
    let usedDriversCount = 0;

    for (const d of activeDrivers) {
      const bucket = driverBuckets.get(d.driverId)!;
      if (bucket.stops.length > 0) {
        usedDriversCount++;
        const routeDist = bucket.stops.length * 4500 + 3000; // mock 4.5km per stop + 3km depot loop
        const routeDur = bucket.stops.length * 600 + 400; // mock 10min per stop

        totalDist += routeDist;
        totalDur += routeDur;
        totalAssignedWeight += bucket.weight;

        const utilPercent = CapacityDomainService.getUtilization(d, bucket.weight);

        routes.push(new Route({
          driverId: d.driverId,
          orderedStops: bucket.stops,
          totalWeightKg: bucket.weight,
          utilizationPercent: utilPercent,
          totalDistanceMeters: routeDist,
          totalDurationSeconds: routeDur,
          polyline: 'mock_route_polyline_stage_2',
          isManuallyModified: false
        }));
      }
    }

    return new DistributionResult({
      routes,
      unassignedStops,
      oversizedStops,
      warnings: unassignedStops.length > 0 ? [{
        code: 'UNASSIGNED_STOPS',
        message: `${unassignedStops.length} stops could not be accommodated within fleet capacity.`,
        messageKey: 'warnings.unassignedStops',
        params: { count: unassignedStops.length }
      }] : [],
      totalDistanceMeters: totalDist,
      totalDurationSeconds: totalDur,
      totalWeightKg: totalAssignedWeight,
      driversUsed: usedDriversCount,
      metrics: {
        initialDistanceMeters: totalDist * 1.2,
        finalDistanceMeters: totalDist,
        initialLoadVariance: 15.5,
        finalLoadVariance: 4.2,
        finalOptimizationScore: 0.85,
        totalDurationSeconds: totalDur,
        iterationCount: 10,
        executionDurationMs: 45,
        activeDriversUsed: usedDriversCount
      }
    });
  }
}
