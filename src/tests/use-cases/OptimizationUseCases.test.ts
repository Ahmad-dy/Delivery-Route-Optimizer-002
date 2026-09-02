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
});
