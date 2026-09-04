import { describe, it, expect, beforeEach } from 'vitest';
import { Depot } from '../../core/domain/entities/Depot';
import { Driver } from '../../core/domain/entities/Driver';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';
import { DeliveryList } from '../../core/domain/entities/DeliveryList';
import { Route } from '../../core/domain/entities/Route';
import { ApprovedDistribution } from '../../core/domain/entities/ApprovedDistribution';
import { OptimizationConfig } from '../../core/domain/value-objects/OptimizationConfig';
import { MockRoutingAdapter } from '../../core/infrastructure/routing/MockRoutingAdapter';
import { DistributionRepository } from '../../core/application/ports/DistributionRepository';
import { CalculateFinalRoutesUseCase } from '../../core/application/use-cases/distribution/CalculateFinalRoutesUseCase';
import { ManualReassignStopUseCase } from '../../core/application/use-cases/distribution/ManualReassignStopUseCase';
import { ManualReorderStopsUseCase } from '../../core/application/use-cases/distribution/ManualReorderStopsUseCase';
import { ApproveDistributionUseCase } from '../../core/application/use-cases/distribution/ApproveDistributionUseCase';

class MockDistributionRepo implements DistributionRepository {
  private distributions: ApprovedDistribution[] = [];
  private currentRevision = 0;

  async saveApprovedDistribution(dist: ApprovedDistribution): Promise<ApprovedDistribution> {
    // Enforce append-only snapshot immutability
    if (this.distributions.some(d => d.distributionId === dist.distributionId)) {
      throw new Error(`Snapshot ${dist.distributionId} already exists and cannot be modified.`);
    }
    this.currentRevision += 1;
    const finalDist = new ApprovedDistribution({
      distributionId: dist.distributionId,
      createdAt: dist.createdAt,
      approvedAt: dist.approvedAt,
      approvedBy: dist.approvedBy,
      depot: dist.depot,
      drivers: dist.drivers,
      routes: dist.routes,
      stops: dist.stops,
      unassigned: dist.unassigned,
      metrics: dist.metrics,
      optimizationScore: dist.optimizationScore,
      warnings: dist.warnings,
      revision: this.currentRevision
    });
    this.distributions.push(finalDist);
    return finalDist;
  }

  async getApprovedDistribution(id: string): Promise<ApprovedDistribution | null> {
    return this.distributions.find(d => d.distributionId === id) || null;
  }

  async listApprovedDistributions(): Promise<readonly ApprovedDistribution[]> {
    return [...this.distributions];
  }
}

describe('Stage 6: Distribution and Dispatch Use Cases', () => {
  let mockRouting: MockRoutingAdapter;
  let calcFinalRoutesUseCase: CalculateFinalRoutesUseCase;
  let distributionRepo: MockDistributionRepo;
  let depot: Depot;
  let drivers: Driver[];
  let stops: DeliveryStop[];
  let initialRoutes: Route[];

  beforeEach(() => {
    mockRouting = new MockRoutingAdapter();
    calcFinalRoutesUseCase = new CalculateFinalRoutesUseCase(mockRouting);
    distributionRepo = new MockDistributionRepo();

    depot = Depot.create({
      latitude: 32.0,
      longitude: 35.0,
      name: 'Main Distribution Depot'
    });

    drivers = [
      Driver.create({
        driverId: 'D1',
        driverName: 'Driver One',
        maximumLoadKg: 1000,
        active: true
      }),
      Driver.create({
        driverId: 'D2',
        driverName: 'Driver Two',
        maximumLoadKg: 1000,
        active: true
      })
    ];

    const list1 = DeliveryList.create({
      listNumber: 'L1',
      buyerCode: 'B1',
      buyerName: 'Buyer 1',
      weightKg: 400
    });
    const list2 = DeliveryList.create({
      listNumber: 'L2',
      buyerCode: 'B2',
      buyerName: 'Buyer 2',
      weightKg: 400
    });
    const list3 = DeliveryList.create({
      listNumber: 'L3',
      buyerCode: 'B3',
      buyerName: 'Buyer 3',
      weightKg: 400
    });

    const stop1 = DeliveryStop.create({
      stopId: 'S1',
      buyerCode: 'B1',
      buyerName: 'Buyer 1',
      latitude: 32.05,
      longitude: 35.05,
      lists: [list1]
    });
    const stop2 = DeliveryStop.create({
      stopId: 'S2',
      buyerCode: 'B2',
      buyerName: 'Buyer 2',
      latitude: 32.10,
      longitude: 35.10,
      lists: [list2]
    });
    const stop3 = DeliveryStop.create({
      stopId: 'S3',
      buyerCode: 'B3',
      buyerName: 'Buyer 3',
      latitude: 32.15,
      longitude: 35.15,
      lists: [list3]
    });

    stops = [stop1, stop2, stop3];

    // Initial distribution: D1 has [S1, S2] (800kg), D2 has [S3] (400kg)
    const route1 = Route.create({
      driverId: 'D1',
      orderedStops: [stop1, stop2],
      totalWeightKg: 800,
      totalDistanceMeters: 25000,
      totalDurationSeconds: 1800,
      utilizationPercent: 80,
      routingStatus: 'OK',
      isManuallyModified: false
    });

    const route2 = Route.create({
      driverId: 'D2',
      orderedStops: [stop3],
      totalWeightKg: 400,
      totalDistanceMeters: 18000,
      totalDurationSeconds: 1200,
      utilizationPercent: 40,
      routingStatus: 'OK',
      isManuallyModified: false
    });

    initialRoutes = [route1, route2];
  });

  describe('CalculateFinalRoutesUseCase', () => {
    it('calculates full road distance for all drivers from and back to depot', async () => {
      const result = await calcFinalRoutesUseCase.execute({
        routes: initialRoutes,
        depot
      });

      expect(result.routes).toHaveLength(2);
      expect(result.routes[0].totalDistanceMeters).toBeGreaterThan(0);
      expect(result.routes[1].totalDistanceMeters).toBeGreaterThan(0);
      expect(result.routes[0].routingStatus).toBe('OK');
      expect(result.hasRoutingFailures).toBe(false);
    });

    it('marks route as ROUTING_UNAVAILABLE and records failure if provider returns invalid distance even with encodedPolyline', async () => {
      const failingRouting: any = {
        getRouteMatrix: (req: any) => mockRouting.getRouteMatrix(req),
        calculateRoute: async () => ({
          locationIds: ['depot', 'S1', 'S2', 'depot'],
          totalDistanceMeters: 0, // INVALID DISTANCE
          totalDurationSeconds: 1200,
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          legs: []
        }),
        getDiagnostics: () => mockRouting.getDiagnostics(),
        clearCache: () => mockRouting.clearCache()
      };
      const uc = new CalculateFinalRoutesUseCase(failingRouting);
      const res = await uc.execute({ routes: initialRoutes, depot });
      expect(res.hasRoutingFailures).toBe(true);
      expect(res.failedDriverIds).toContain('D1');
      expect(res.routes[0].routingStatus).toBe('ROUTING_UNAVAILABLE');
      expect(res.routes[0].polyline).toBeUndefined();
      expect(res.routes[0].totalDistanceMeters).toBe(0);
      expect(res.routes[0].totalDurationSeconds).toBe(0);
      expect(res.routes[0].legs).toEqual([]);
    });
  });

  describe('ManualReassignStopUseCase', () => {
    it('moves a stop from D1 to D2 successfully without violating capacity', async () => {
      const useCase = new ManualReassignStopUseCase(mockRouting, calcFinalRoutesUseCase);

      // Reassign stop S2 (400kg) from D1 to D2
      // D1 becomes 400kg (40%), D2 becomes 800kg (80%)
      const result = await useCase.execute({
        stopId: 'S2',
        sourceDriverId: 'D1',
        targetDriverId: 'D2',
        currentRoutes: initialRoutes,
        unassignedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(true);

      const routeD1 = result.routes.find(r => r.driverId === 'D1')!;
      const routeD2 = result.routes.find(r => r.driverId === 'D2')!;

      expect(routeD1.orderedStops.map(s => s.stopId)).toEqual(['S1']);
      expect(routeD1.totalWeightKg).toBe(400);

      expect(routeD2.orderedStops.map(s => s.stopId)).toContain('S2');
      expect(routeD2.totalWeightKg).toBe(800);
    });

    it('rejects reassignment if it violates the 110% operational capacity ceiling', async () => {
      const useCase = new ManualReassignStopUseCase(mockRouting, calcFinalRoutesUseCase);

      // Create a heavy stop of 800kg
      const heavyList = DeliveryList.create({
        listNumber: 'HL',
        buyerCode: 'BH',
        buyerName: 'Heavy Buyer',
        weightKg: 800
      });
      const heavyStop = DeliveryStop.create({
        stopId: 'SH',
        buyerCode: 'BH',
        buyerName: 'Heavy Buyer',
        latitude: 32.06,
        longitude: 35.06,
        lists: [heavyList]
      });

      // D1 currently has 800kg (Nominal 1000kg, Max allowed 1100kg)
      // Attempting to move heavyStop (800kg) to D1 would result in 1600kg (160% > 110%)
      const result = await useCase.execute({
        stopId: 'SH',
        targetDriverId: 'D1',
        currentRoutes: initialRoutes,
        unassignedStops: [heavyStop],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('1,100');
      expect(result.errorMessage).toContain('الحد التشغيلي');
    });

    it('allows moving a stop to the unassigned pool', async () => {
      const useCase = new ManualReassignStopUseCase(mockRouting, calcFinalRoutesUseCase);

      const result = await useCase.execute({
        stopId: 'S2',
        sourceDriverId: 'D1',
        targetDriverId: 'UNASSIGNED',
        currentRoutes: initialRoutes,
        unassignedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(true);
      expect(result.unassignedStops.map(s => s.stopId)).toContain('S2');
      const routeD1 = result.routes.find(r => r.driverId === 'D1')!;
      expect(routeD1.orderedStops.map(s => s.stopId)).toEqual(['S1']);
    });

    it('returns success: false when routing calculation fails for affected drivers', async () => {
      const failingRouting: any = {
        getRouteMatrix: (req: any) => mockRouting.getRouteMatrix(req),
        calculateRoute: async () => {
          throw new Error('Google Routing API rate limit exceeded');
        },
        getDiagnostics: () => mockRouting.getDiagnostics(),
        clearCache: () => mockRouting.clearCache()
      };
      const failingCalcUC = new CalculateFinalRoutesUseCase(failingRouting);
      const useCase = new ManualReassignStopUseCase(mockRouting, failingCalcUC);

      const result = await useCase.execute({
        stopId: 'S2',
        targetDriverId: 'D2',
        currentRoutes: initialRoutes,
        unassignedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('ROUTING_UNAVAILABLE');
      // State remains unchanged
      expect(result.routes[0].orderedStops.map(s => s.stopId)).toEqual(['S1', 'S2']);
    });
  });

  describe('ManualReorderStopsUseCase', () => {
    it('reorders stops inside a driver route and recalculates road distance', async () => {
      const useCase = new ManualReorderStopsUseCase(mockRouting, calcFinalRoutesUseCase);

      // In initialRoutes, D1 has [S1, S2]
      // Reorder to [S2, S1]
      const result = await useCase.execute({
        driverId: 'D1',
        newOrderedStopIds: ['S2', 'S1'],
        currentRoutes: initialRoutes,
        unassignedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(true);
      const updatedD1 = result.routes.find(r => r.driverId === 'D1')!;
      expect(updatedD1.orderedStops.map(s => s.stopId)).toEqual(['S2', 'S1']);
      expect(updatedD1.totalWeightKg).toBe(800); // Weight preserved
    });

    it('returns success: false when routing recalculation fails (ROUTING_UNAVAILABLE)', async () => {
      const failingRouting: any = {
        getRouteMatrix: (req: any) => mockRouting.getRouteMatrix(req),
        calculateRoute: async () => {
          throw new Error('Connection timeout to routing service');
        },
        getDiagnostics: () => mockRouting.getDiagnostics(),
        clearCache: () => mockRouting.clearCache()
      };
      const failingCalcUC = new CalculateFinalRoutesUseCase(failingRouting);
      const useCase = new ManualReorderStopsUseCase(mockRouting, failingCalcUC);

      const result = await useCase.execute({
        driverId: 'D1',
        newOrderedStopIds: ['S2', 'S1'],
        currentRoutes: initialRoutes,
        unassignedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('ROUTING_UNAVAILABLE');
      // Invariant: Stops remain untouched
      expect(result.routes[0].orderedStops.map(s => s.stopId)).toEqual(['S1', 'S2']);
    });
  });

  describe('ApproveDistributionUseCase', () => {
    it('approves a valid distribution and saves an immutable snapshot with revision 1', async () => {
      const useCase = new ApproveDistributionUseCase(distributionRepo);

      const result = await useCase.execute({
        routes: initialRoutes,
        unassignedStops: [],
        oversizedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000,
        approvedBy: 'Dispatcher Ali'
      });

      expect(result.success).toBe(true);
      expect(result.approvedDistribution).toBeDefined();
      expect(result.approvedDistribution?.revision).toBe(1);
      expect(result.approvedDistribution?.approvedBy).toBe('Dispatcher Ali');

      // Verify saved in repository
      const savedSnapshots = await distributionRepo.listApprovedDistributions();
      expect(savedSnapshots).toHaveLength(1);
      expect(savedSnapshots[0].distributionId).toBe(result.approvedDistribution!.distributionId);
    });

    it('rejects approval if a route has ROUTING_UNAVAILABLE', async () => {
      const useCase = new ApproveDistributionUseCase(distributionRepo);

      const brokenRoute = Route.create({
        driverId: 'D1',
        orderedStops: stops.slice(0, 2),
        totalWeightKg: 800,
        totalDistanceMeters: 25000,
        totalDurationSeconds: 1800,
        utilizationPercent: 80,
        routingStatus: 'ROUTING_UNAVAILABLE',
        isManuallyModified: false
      });

      const result = await useCase.execute({
        routes: [brokenRoute, initialRoutes[1]],
        unassignedStops: [],
        oversizedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('creates subsequent revisions atomically (Rev 1, Rev 2)', async () => {
      const useCase = new ApproveDistributionUseCase(distributionRepo);

      // Revision 1
      const res1 = await useCase.execute({
        routes: initialRoutes,
        unassignedStops: [],
        oversizedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });
      expect(res1.approvedDistribution?.revision).toBe(1);

      // Revision 2
      const res2 = await useCase.execute({
        routes: initialRoutes,
        unassignedStops: [],
        oversizedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });
      expect(res2.approvedDistribution?.revision).toBe(2);

      const all = await distributionRepo.listApprovedDistributions();
      expect(all).toHaveLength(2);
    });

    it('enforces snapshot immutability and rejects attempting to overwrite an existing distribution ID', async () => {
      const useCase = new ApproveDistributionUseCase(distributionRepo);

      const res1 = await useCase.execute({
        distributionId: 'dist_immutable_fixed_001',
        routes: initialRoutes,
        unassignedStops: [],
        oversizedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      });
      expect(res1.success).toBe(true);

      // Attempt to overwrite same distributionId must fail/throw
      await expect(useCase.execute({
        distributionId: 'dist_immutable_fixed_001',
        routes: initialRoutes,
        unassignedStops: [],
        oversizedStops: [],
        activeDrivers: drivers,
        depot,
        config: OptimizationConfig.default(),
        referenceDistanceMeters: 43000
      })).rejects.toThrow(/already exists and cannot be modified/);
    });
  });
});
