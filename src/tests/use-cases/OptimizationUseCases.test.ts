import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizationEngine } from '../../core/infrastructure/optimization/OptimizationEngine';
import { OptimizeDistributionUseCase } from '../../core/application/use-cases/optimization/OptimizeDistributionUseCase';
import { ReassignStopUseCase } from '../../core/application/use-cases/optimization/ReassignStopUseCase';
import { RouteSequenceOptimizer } from '../../core/domain/services/RouteSequenceOptimizer';
import { OptimizationEvaluationService } from '../../core/domain/services/OptimizationEvaluationService';
import { DistributionInvariantValidator } from '../../core/domain/services/DistributionValidator';
import { CapacityDomainService } from '../../core/domain/services/CapacityDomainService';
import { Depot } from '../../core/domain/entities/Depot';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';
import { DeliveryList } from '../../core/domain/entities/DeliveryList';
import { Driver } from '../../core/domain/entities/Driver';
import { GeoPoint } from '../../core/domain/value-objects/GeoPoint';
import { OptimizationConfig } from '../../core/domain/value-objects/OptimizationConfig';
import { IRoutingService, RouteMatrix, RouteMatrixRequest, FullRouteCalculationRequest, FullRouteCalculationResult, RoutingDiagnostics } from '../../core/application/ports/IRoutingService';

describe('Stage 5: Optimization Engine & Driver Assignment Tests', () => {
  const depot = new Depot(24.7136, 46.6753, 'Central Hub');
  const depotPoint = depot.getGeoPoint();

  const stopPointA = new GeoPoint(24.7200, 46.6800);
  const stopPointB = new GeoPoint(24.7300, 46.6900);
  const stopPointC = new GeoPoint(24.7400, 46.7000);
  const stopPointD = new GeoPoint(24.7500, 46.7100);

  const drivers: Driver[] = [
    new Driver({ driverId: 'D1', driverName: 'Driver Ahmed', maximumLoadKg: 1000, active: true }),
    new Driver({ driverId: 'D2', driverName: 'Driver Omar', maximumLoadKg: 1000, active: true }),
    new Driver({ driverId: 'D3_INACTIVE', driverName: 'Driver Inactive', maximumLoadKg: 1000, active: false })
  ];

  const createStop = (stopId: string, buyerCode: string, buyerName: string, weightKg: number, point: GeoPoint): DeliveryStop => {
    const list = new DeliveryList('L_' + stopId, buyerCode, buyerName, weightKg);
    return new DeliveryStop(
      stopId,
      buyerCode,
      buyerName,
      point.latitude,
      point.longitude,
      [list]
    );
  };

  const stops: DeliveryStop[] = [
    createStop('STOP_1', 'B1', 'Market Al-Noor', 300, stopPointA),
    createStop('STOP_2', 'B2', 'Store Al-Amal', 400, stopPointB),
    createStop('STOP_3', 'B3', 'Supermarket Al-Rehab', 500, stopPointC),
    createStop('STOP_4', 'B4', 'Grocery Al-Baraka', 200, stopPointD)
  ];

  const points = [
    { id: 'DEPOT', point: depotPoint },
    { id: 'STOP_1', point: stopPointA },
    { id: 'STOP_2', point: stopPointB },
    { id: 'STOP_3', point: stopPointC },
    { id: 'STOP_4', point: stopPointD }
  ];

  const syntheticMatrix: RouteMatrix = {
    origins: points,
    destinations: points,
    elements: points.map((orig, oIdx) =>
      points.map((dest, dIdx) => {
        if (oIdx === dIdx) {
          return {
            originId: orig.id,
            destinationId: dest.id,
            originIndex: oIdx,
            destinationIndex: dIdx,
            distanceMeters: 0,
            durationSeconds: 0,
            status: 'OK' as const
          };
        }
        const dist = Math.abs(oIdx - dIdx) * 3000;
        const dur = Math.abs(oIdx - dIdx) * 400;
        return {
          originId: orig.id,
          destinationId: dest.id,
          originIndex: oIdx,
          destinationIndex: dIdx,
          distanceMeters: dist,
          durationSeconds: dur,
          status: 'OK' as const
        };
      })
    )
  };

  class MockRoutingService implements IRoutingService {
    public async getRouteMatrix(_req: RouteMatrixRequest): Promise<RouteMatrix> {
      return syntheticMatrix;
    }
    public async calculateRoute(_req: FullRouteCalculationRequest): Promise<FullRouteCalculationResult> {
      return {
        locationIds: ['DEPOT', 'STOP_1', 'DEPOT'],
        totalDistanceMeters: 6000,
        totalDurationSeconds: 800,
        legs: []
      };
    }
    public getDiagnostics(): RoutingDiagnostics {
      return {
        requestCount: 1,
        cacheHits: 0,
        cacheMisses: 1,
        retryCount: 0,
        failedRequests: 0,
        routingDurationMs: 10
      };
    }
    public clearCache(): void {}
  }

  let optimizationEngine: OptimizationEngine;
  let mockRoutingService: IRoutingService;
  let optimizeUseCase: OptimizeDistributionUseCase;
  let reassignUseCase: ReassignStopUseCase;

  beforeEach(() => {
    optimizationEngine = new OptimizationEngine();
    mockRoutingService = new MockRoutingService();
    optimizeUseCase = new OptimizeDistributionUseCase(optimizationEngine, mockRoutingService);
    reassignUseCase = new ReassignStopUseCase();
  });

  it('runs initial construction and improves with 2-Opt without exceeding 110% operational ceiling', async () => {
    const result = await optimizeUseCase.execute({
      depot,
      stops,
      drivers,
      config: new OptimizationConfig(0.70, 0.30, 0.10)
    });

    expect(result).toBeDefined();
    expect(result.routes.length).toBeGreaterThanOrEqual(1);

    // Inactive drivers must not be assigned
    expect(result.routes.some(r => r.driverId === 'D3_INACTIVE')).toBe(false);

    // All 1400kg distributed
    expect(result.totalWeightKg).toBe(1400);
    expect(result.unassignedStops.length).toBe(0);

    // Each active driver route strictly <= 1100kg (110% of 1000kg)
    for (const route of result.routes) {
      const driver = drivers.find(d => d.driverId === route.driverId)!;
      const maxAllowed = CapacityDomainService.getMaximumAllowedCapacity(driver);
      expect(route.totalWeightKg).toBeLessThanOrEqual(maxAllowed);
      expect(route.orderedStops.length).toBeGreaterThan(0);
      expect(route.totalDistanceMeters).toBeGreaterThan(0);
    }
  });

  it('evaluates objective score incorporating 70% distance and 30% load disparity weights', () => {
    const activeDrivers = drivers.filter(d => d.active);
    const evalResult = OptimizationEvaluationService.evaluateSolution({
      routes: [
        {
          driverId: 'D1',
          orderedStops: [stops[0], stops[1]],
          totalWeightKg: 700,
          totalDistanceMeters: 6000,
          totalDurationSeconds: 800
        },
        {
          driverId: 'D2',
          orderedStops: [stops[2], stops[3]],
          totalWeightKg: 700,
          totalDistanceMeters: 6000,
          totalDurationSeconds: 800
        }
      ],
      activeDrivers,
      referenceDistanceMeters: 12000,
      config: new OptimizationConfig()
    });

    expect(evalResult.finalScore).toBeGreaterThanOrEqual(0);
    expect(evalResult.loadDisparity).toBe(0); // Perfect 700kg vs 700kg balance
  });

  it('optimizes route sequence using 2-Opt heuristic local search', () => {
    const locMap = new Map<string, number>();
    syntheticMatrix.origins.forEach((loc, idx) => locMap.set(loc.id, idx));

    const seqResult = RouteSequenceOptimizer.optimizeSequence(stops, locMap, syntheticMatrix);
    expect(seqResult.orderedStops.length).toBe(stops.length);
    expect(seqResult.distanceMeters).toBeGreaterThan(0);
    expect(seqResult.durationSeconds).toBeGreaterThan(0);
  });

  it('validates distribution invariants using DistributionInvariantValidator', async () => {
    const result = await optimizeUseCase.execute({
      depot,
      stops,
      drivers
    });

    const activeDrivers = drivers.filter(d => d.active);
    const validation = DistributionInvariantValidator.validate(
      result,
      activeDrivers,
      depot,
      syntheticMatrix
    );

    expect(validation.isValid).toBe(true);
    expect(validation.violations.length).toBe(0);
  });

  it('manually reassigns a stop to unassigned and back to maintain operational invariants', async () => {
    const initialResult = await optimizeUseCase.execute({
      depot,
      stops,
      drivers
    });

    const d1Route = initialResult.routes.find(r => r.driverId === 'D1')!;
    const stopToMove = d1Route.orderedStops[0];

    // Reassign to UNASSIGNED
    const unassignedResult = reassignUseCase.execute({
      currentDistribution: initialResult,
      stopId: stopToMove.stopId,
      targetDriverId: 'UNASSIGNED',
      activeDrivers: drivers.filter(d => d.active),
      depot,
      matrix: syntheticMatrix
    });

    expect(unassignedResult.unassignedStops.some(s => s.stopId === stopToMove.stopId)).toBe(true);

    // Reassign back to D1
    const reassignedResult = reassignUseCase.execute({
      currentDistribution: unassignedResult,
      stopId: stopToMove.stopId,
      targetDriverId: 'D1',
      activeDrivers: drivers.filter(d => d.active),
      depot,
      matrix: syntheticMatrix
    });

    const newD1Route = reassignedResult.routes.find(r => r.driverId === 'D1')!;
    expect(newD1Route.orderedStops.some(s => s.stopId === stopToMove.stopId)).toBe(true);
    expect(reassignedResult.unassignedStops.some(s => s.stopId === stopToMove.stopId)).toBe(false);
  });

  it('throws CapacityExceededError when manual reassignment exceeds 110% buffer', async () => {
    const heavyStops = [
      createStop('STOP_1', 'B1', 'Store 1', 700, stopPointA),
      createStop('STOP_2', 'B2', 'Store 2', 500, stopPointB)
    ];

    const initialResult = await optimizeUseCase.execute({
      depot,
      stops: heavyStops,
      drivers
    });

    const routeWithS1 = initialResult.routes.find(r => r.orderedStops.some(s => s.stopId === 'STOP_1'))!;
    const otherDriverId = initialResult.routes.find(r => r.driverId !== routeWithS1.driverId)!.driverId;

    // Moving 700kg to driver with 500kg = 1200kg > 1100kg (110%)
    expect(() =>
      reassignUseCase.execute({
        currentDistribution: initialResult,
        stopId: 'STOP_1',
        targetDriverId: otherDriverId,
        activeDrivers: drivers.filter(d => d.active),
        depot,
        matrix: syntheticMatrix
      })
    ).toThrow();
  });

  describe('Mathematical 70/30 Objective & Normalization Verification', () => {
    const config7030 = new OptimizationConfig(0.70, 0.30, 0.10);
    const activeDrivers = [
      new Driver({ driverId: 'D1', driverName: 'Driver 1', maximumLoadKg: 1000, active: true }),
      new Driver({ driverId: 'D2', driverName: 'Driver 2', maximumLoadKg: 1000, active: true })
    ];

    it('guarantees normalizedLoadBalance is strictly bounded in [0, 1] under all conditions', () => {
      // Case 1: Perfectly balanced (50% on both drivers)
      const balanced = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 500, totalDistanceMeters: 10000, totalDurationSeconds: 1000, orderedStops: [stops[0]] },
          { driverId: 'D2', totalWeightKg: 500, totalDistanceMeters: 10000, totalDurationSeconds: 1000, orderedStops: [stops[1]] }
        ],
        activeDrivers,
        referenceDistanceMeters: 20000,
        config: config7030
      });
      expect(balanced.loadDisparity).toBe(0);
      expect(balanced.normalizedLoadBalance).toBe(0);
      expect(balanced.loadBalanceComponent).toBe(0);
      expect(balanced.finalScore).toBeCloseTo(0.70 * (20000 / 20000) + 0, 5);

      // Case 2: Extreme theoretical disparity (one driver at max 1100kg [110%], other at 0kg [0%])
      const maxImbalance = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 1100, totalDistanceMeters: 15000, totalDurationSeconds: 1200, orderedStops: [stops[0], stops[1]] },
          { driverId: 'D2', totalWeightKg: 0, totalDistanceMeters: 0, totalDurationSeconds: 0, orderedStops: [] }
        ],
        activeDrivers,
        referenceDistanceMeters: 20000,
        config: config7030
      });
      // Single active driver used -> disparity = 0 per definition
      expect(maxImbalance.usedDriversCount).toBe(1);
      expect(maxImbalance.normalizedLoadBalance).toBe(0);

      // Case 3: Two used drivers with maximum disparity (D1 at 1100kg [110%], D2 at 10kg [1%])
      const twoDriverExtreme = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 1100, totalDistanceMeters: 15000, totalDurationSeconds: 1200, orderedStops: [stops[0]] },
          { driverId: 'D2', totalWeightKg: 10, totalDistanceMeters: 5000, totalDurationSeconds: 500, orderedStops: [stops[1]] }
        ],
        activeDrivers,
        referenceDistanceMeters: 20000,
        config: config7030
      });
      expect(twoDriverExtreme.loadDisparity).toBeCloseTo(1.10 - 0.01, 2);
      expect(twoDriverExtreme.normalizedLoadBalance).toBeGreaterThanOrEqual(0);
      expect(twoDriverExtreme.normalizedLoadBalance).toBeLessThanOrEqual(1.0);
      expect(twoDriverExtreme.loadBalanceComponent).toBeLessThanOrEqual(0.30);
    });

    it('proves the 70/30 composite trade-off mathematically selects the lower combined score', () => {
      // We compare two valid candidate solutions:
      // Solution A (Distance-biased): Shorter distance (20km), but imbalanced (D1 = 1000kg [100%], D2 = 200kg [20%])
      // Solution B (Balance-biased): Slightly longer distance (22km, +10%), but perfectly balanced (D1 = 600kg [60%], D2 = 600kg [60%])
      const refDist = 20000;

      const evalA = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 1000, totalDistanceMeters: 12000, totalDurationSeconds: 1000, orderedStops: [stops[0]] },
          { driverId: 'D2', totalWeightKg: 200, totalDistanceMeters: 8000, totalDurationSeconds: 800, orderedStops: [stops[1]] }
        ],
        activeDrivers,
        referenceDistanceMeters: refDist,
        config: config7030
      });

      const evalB = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 600, totalDistanceMeters: 11000, totalDurationSeconds: 1000, orderedStops: [stops[0]] },
          { driverId: 'D2', totalWeightKg: 600, totalDistanceMeters: 11000, totalDurationSeconds: 1000, orderedStops: [stops[1]] }
        ],
        activeDrivers,
        referenceDistanceMeters: refDist,
        config: config7030
      });

      // Verification of formula components:
      // Solution A:
      // normalizedDistance = 20000 / 20000 = 1.00
      // distanceComponent = 0.70 * 1.00 = 0.70
      // disparity = 1.0 - 0.2 = 0.80
      // normalizedLoadBalance = 0.80 / 1.10 = ~0.7272
      // loadBalanceComponent = 0.30 * 0.7272 = ~0.2181
      // finalScore A = ~0.9181
      expect(evalA.distanceComponent).toBeCloseTo(0.70, 4);
      expect(evalA.normalizedLoadBalance).toBeCloseTo(0.80 / 1.10, 4);
      expect(evalA.finalScore).toBeCloseTo(0.70 + 0.30 * (0.80 / 1.10), 4);

      // Solution B:
      // normalizedDistance = 22000 / 20000 = 1.10
      // distanceComponent = 0.70 * 1.10 = 0.77
      // disparity = 0.6 - 0.6 = 0
      // normalizedLoadBalance = 0
      // loadBalanceComponent = 0
      // finalScore B = 0.77
      expect(evalB.distanceComponent).toBeCloseTo(0.77, 4);
      expect(evalB.normalizedLoadBalance).toBe(0);
      expect(evalB.finalScore).toBeCloseTo(0.77, 4);

      // The 70/30 composite objective picks Solution B because 0.77 < 0.9181!
      expect(evalB.finalScore).toBeLessThan(evalA.finalScore);
      expect(OptimizationEvaluationService.compareCandidateSolutions(evalB, evalA)).toBeLessThan(0);
    });

    it('correctly calculates relative utilization for heterogeneous driver capacities', () => {
      // Driver A: capacity 500kg
      // Driver B: capacity 1000kg
      const heterogeneousDrivers = [
        new Driver({ driverId: 'DA', driverName: 'Driver 500', maximumLoadKg: 500, active: true }),
        new Driver({ driverId: 'DB', driverName: 'Driver 1000', maximumLoadKg: 1000, active: true })
      ];

      // Assignment 1: Both drivers loaded to exactly 80% of their respective capacity
      // Driver A receives 400kg (400 / 500 = 80%)
      // Driver B receives 800kg (800 / 1000 = 80%)
      // Raw weights differ (800 vs 400), but relative utilization is identical!
      const evalFair = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'DA', totalWeightKg: 400, totalDistanceMeters: 5000, totalDurationSeconds: 500, orderedStops: [stops[0]] },
          { driverId: 'DB', totalWeightKg: 800, totalDistanceMeters: 5000, totalDurationSeconds: 500, orderedStops: [stops[1]] }
        ],
        activeDrivers: heterogeneousDrivers,
        referenceDistanceMeters: 10000,
        config: config7030
      });

      expect(evalFair.loadDisparity).toBe(0);
      expect(evalFair.normalizedLoadBalance).toBe(0);

      // Assignment 2: Equal raw weight (500kg each) produces unfair utilization:
      // Driver A = 500 / 500 = 100%
      // Driver B = 500 / 1000 = 50%
      // Disparity = 1.0 - 0.5 = 0.50
      const evalEqualRawWeight = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'DA', totalWeightKg: 500, totalDistanceMeters: 5000, totalDurationSeconds: 500, orderedStops: [stops[0]] },
          { driverId: 'DB', totalWeightKg: 500, totalDistanceMeters: 5000, totalDurationSeconds: 500, orderedStops: [stops[1]] }
        ],
        activeDrivers: heterogeneousDrivers,
        referenceDistanceMeters: 10000,
        config: config7030
      });

      expect(evalEqualRawWeight.loadDisparity).toBeCloseTo(0.50, 4);
      expect(evalEqualRawWeight.normalizedLoadBalance).toBeCloseTo(0.50 / 1.10, 4);
      expect(evalFair.finalScore).toBeLessThan(evalEqualRawWeight.finalScore);
    });

    it('assigns multi-zone stops based on road network distance matrix rather than stop labels', async () => {
      // Create two distinct geographic clusters:
      // Cluster North: STOP_N1, STOP_N2 (near north coordinates)
      // Cluster South: STOP_S1, STOP_S2 (near south coordinates)
      // Stop IDs intentionally have arbitrary names to prove routing depends on matrix, not name
      const northPoint1 = new GeoPoint(24.8500, 46.6000);
      const northPoint2 = new GeoPoint(24.8600, 46.6100);
      const southPoint1 = new GeoPoint(24.5500, 46.7500);
      const southPoint2 = new GeoPoint(24.5600, 46.7600);

      const zoneStops = [
        createStop('Z_ALPHA', 'B_N1', 'North Market 1', 300, northPoint1),
        createStop('Z_BETA', 'B_N2', 'North Market 2', 300, northPoint2),
        createStop('Z_GAMMA', 'B_S1', 'South Store 1', 300, southPoint1),
        createStop('Z_DELTA', 'B_S2', 'South Store 2', 300, southPoint2)
      ];

      const zonePoints = [
        { id: 'DEPOT', point: depotPoint },
        { id: 'Z_ALPHA', point: northPoint1 },
        { id: 'Z_BETA', point: northPoint2 },
        { id: 'Z_GAMMA', point: southPoint1 },
        { id: 'Z_DELTA', point: southPoint2 }
      ];

      // Build distance matrix where intra-cluster distances are small (2 km)
      // and inter-cluster distances are large (35 km)
      const zoneMatrix: RouteMatrix = {
        origins: zonePoints,
        destinations: zonePoints,
        elements: zonePoints.map(orig =>
          zonePoints.map(dest => {
            if (orig.id === dest.id) {
              return {
                originId: orig.id,
                destinationId: dest.id,
                originIndex: 0,
                destinationIndex: 0,
                distanceMeters: 0,
                durationSeconds: 0,
                status: 'OK' as const
              };
            }
            const isNorthOrig = orig.id === 'Z_ALPHA' || orig.id === 'Z_BETA';
            const isNorthDest = dest.id === 'Z_ALPHA' || dest.id === 'Z_BETA';
            const isSouthOrig = orig.id === 'Z_GAMMA' || orig.id === 'Z_DELTA';
            const isSouthDest = dest.id === 'Z_GAMMA' || dest.id === 'Z_DELTA';

            let dist = 10000;
            if ((isNorthOrig && isNorthDest) || (isSouthOrig && isSouthDest)) {
              dist = 2000; // intra-zone
            } else if ((isNorthOrig && isSouthDest) || (isSouthOrig && isNorthDest)) {
              dist = 35000; // inter-zone cross-city penalty
            }
            return {
              originId: orig.id,
              destinationId: dest.id,
              originIndex: 0,
              destinationIndex: 0,
              distanceMeters: dist,
              durationSeconds: Math.round(dist / 15),
              status: 'OK' as const
            };
          })
        )
      };

      class ZoneRoutingService implements IRoutingService {
        public async getRouteMatrix(): Promise<RouteMatrix> {
          return zoneMatrix;
        }
        public async calculateRoute(): Promise<FullRouteCalculationResult> {
          return {
            locationIds: ['DEPOT'],
            totalDistanceMeters: 5000,
            totalDurationSeconds: 400,
            legs: []
          };
        }
        public getDiagnostics(): RoutingDiagnostics {
          return {
            requestCount: 1,
            cacheHits: 0,
            cacheMisses: 1,
            retryCount: 0,
            failedRequests: 0,
            routingDurationMs: 10
          };
        }
        public clearCache(): void {}
      }

      const zoneEngine = new OptimizationEngine();
      const zoneResult = await zoneEngine.optimize({
        depot,
        stops: zoneStops,
        drivers: [
          new Driver({ driverId: 'D_NORTH', driverName: 'North Driver', maximumLoadKg: 1000, active: true }),
          new Driver({ driverId: 'D_SOUTH', driverName: 'South Driver', maximumLoadKg: 1000, active: true })
        ],
        config: config7030,
        routingService: new ZoneRoutingService()
      });

      expect(zoneResult.unassignedStops.length).toBe(0);
      expect(zoneResult.routes.length).toBe(2);

      // Verify each driver receives stops from the same geographical cluster based on road distance matrix
      for (const route of zoneResult.routes) {
        const stopIds = route.orderedStops.map(s => s.stopId);
        const allNorth = stopIds.every(id => id === 'Z_ALPHA' || id === 'Z_BETA');
        const allSouth = stopIds.every(id => id === 'Z_GAMMA' || id === 'Z_DELTA');
        expect(allNorth || allSouth).toBe(true);
      }
    });

    it('proves geographically clustered solution mathematically beats cross-zone solution in 70/30 score', () => {
      // Direct comparative evaluation as requested:
      // Compare Solution A (Cross-zone tangled routes) vs Solution B (Geographically clustered routes)
      // Both have identical total weight and perfect 50/50 balance (600kg each, 0% disparity).
      // Solution A traverses inter-zone cross-city highways (110,000m).
      // Solution B confines each route to local intra-zone streets (44,000m).
      const refBaseline = 44000;
      const drivers = [
        new Driver({ driverId: 'D1', driverName: 'Driver 1', maximumLoadKg: 1000, active: true }),
        new Driver({ driverId: 'D2', driverName: 'Driver 2', maximumLoadKg: 1000, active: true })
      ];

      // Solution A: Cross-zone (Route 1 visits North then South; Route 2 visits North then South)
      const evalCrossZoneA = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 600, totalDistanceMeters: 55000, totalDurationSeconds: 3600, orderedStops: [stops[0], stops[2]] },
          { driverId: 'D2', totalWeightKg: 600, totalDistanceMeters: 55000, totalDurationSeconds: 3600, orderedStops: [stops[1], stops[3]] }
        ],
        activeDrivers: drivers,
        referenceDistanceMeters: refBaseline,
        config: config7030
      });

      // Solution B: Clustered (Route 1 visits only North; Route 2 visits only South)
      const evalClusteredB = OptimizationEvaluationService.evaluateSolution({
        routes: [
          { driverId: 'D1', totalWeightKg: 600, totalDistanceMeters: 22000, totalDurationSeconds: 1400, orderedStops: [stops[0], stops[1]] },
          { driverId: 'D2', totalWeightKg: 600, totalDistanceMeters: 22000, totalDurationSeconds: 1400, orderedStops: [stops[2], stops[3]] }
        ],
        activeDrivers: drivers,
        referenceDistanceMeters: refBaseline,
        config: config7030
      });

      // Both solutions have equal load balance (zero disparity)
      expect(evalCrossZoneA.normalizedLoadBalance).toBe(0);
      expect(evalClusteredB.normalizedLoadBalance).toBe(0);

      // Total road distance difference: 110km vs 44km
      expect(evalCrossZoneA.totalDistanceMeters).toBe(110000);
      expect(evalClusteredB.totalDistanceMeters).toBe(44000);

      // Score breakdown:
      // Solution A: 0.70 * (110000 / 44000) = 1.75
      // Solution B: 0.70 * (44000 / 44000)  = 0.70
      expect(evalCrossZoneA.finalScore).toBeCloseTo(1.75, 4);
      expect(evalClusteredB.finalScore).toBeCloseTo(0.70, 4);

      // Strictly verifies score(B) < score(A) and compareCandidateSolutions selects B
      expect(evalClusteredB.finalScore).toBeLessThan(evalCrossZoneA.finalScore);
      expect(OptimizationEvaluationService.compareCandidateSolutions(evalClusteredB, evalCrossZoneA)).toBeLessThan(0);
      expect(OptimizationEvaluationService.compareCandidateSolutions(evalCrossZoneA, evalClusteredB)).toBeGreaterThan(0);
    });
  });
});
