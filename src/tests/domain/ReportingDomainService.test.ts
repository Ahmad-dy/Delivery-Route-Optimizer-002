import { describe, it, expect } from 'vitest';
import { ReportingDomainService } from '../../core/domain/entities/ReportingEntities';
import { ApprovedDistribution, ApprovedDistributionProps } from '../../core/domain/entities/ApprovedDistribution';
import { DeliveryStopProps } from '../../core/domain/entities/DeliveryStop';

function createMockApprovedDistribution(override: Partial<ApprovedDistributionProps> = {}): ApprovedDistribution {
  const stop1: DeliveryStopProps = {
    stopId: 'stop-1',
    buyerCode: 'B1',
    buyerName: 'Buyer 1',
    latitude: 24.72,
    longitude: 46.68,
    lists: [{ listNumber: 'L1', buyerCode: 'B1', buyerName: 'Buyer 1', weightKg: 400 }],
    totalWeightKg: 400
  };
  const stop2: DeliveryStopProps = {
    stopId: 'stop-2',
    buyerCode: 'B2',
    buyerName: 'Buyer 2',
    latitude: 24.73,
    longitude: 46.69,
    lists: [{ listNumber: 'L2', buyerCode: 'B2', buyerName: 'Buyer 2', weightKg: 400 }],
    totalWeightKg: 400
  };
  const stop3: DeliveryStopProps = {
    stopId: 'stop-3',
    buyerCode: 'B3',
    buyerName: 'Buyer 3',
    latitude: 24.74,
    longitude: 46.70,
    lists: [{ listNumber: 'L3', buyerCode: 'B3', buyerName: 'Buyer 3', weightKg: 900 }],
    totalWeightKg: 900
  };

  const mockMetrics = {
    initialDistanceMeters: 30000,
    finalDistanceMeters: 28000,
    initialLoadVariance: 100,
    finalLoadVariance: 20,
    finalOptimizationScore: 1450,
    totalDurationSeconds: 3300,
    iterationCount: 50,
    executionDurationMs: 150,
    activeDriversUsed: 2
  };

  const defaultProps: ApprovedDistributionProps = {
    distributionId: 'dist-test-1',
    revision: 1,
    createdAt: '2026-09-01T10:00:00Z',
    approvedAt: '2026-09-01T10:15:00Z',
    approvedBy: 'dispatcher@test.com',
    depot: { latitude: 24.7136, longitude: 46.6753, name: 'Main Depot' },
    drivers: [
      { driverId: 'D1', driverName: 'Driver 1', maximumLoadKg: 1000, active: true },
      { driverId: 'D2', driverName: 'Driver 2', maximumLoadKg: 1500, active: true }
    ],
    routes: [
      {
        driverId: 'D1',
        orderedStops: [stop1, stop2],
        totalWeightKg: 800,
        totalDistanceMeters: 12000,
        totalDurationSeconds: 1500,
        utilizationPercent: 80,
        routingStatus: 'OK',
        isManuallyModified: false,
        legs: []
      },
      {
        driverId: 'D2',
        orderedStops: [stop3],
        totalWeightKg: 900,
        totalDistanceMeters: 16000,
        totalDurationSeconds: 1800,
        utilizationPercent: 60,
        routingStatus: 'OK',
        isManuallyModified: false,
        legs: []
      }
    ],
    stops: [stop1, stop2, stop3],
    unassigned: [],
    metrics: mockMetrics,
    optimizationScore: 1450,
    warnings: []
  };

  return ApprovedDistribution.create({ ...defaultProps, ...override });
}

describe('ReportingDomainService', () => {
  it('calculates operational metrics accurately across multiple distributions', () => {
    const dist1 = createMockApprovedDistribution({ distributionId: 'dist-1', revision: 1 });

    const stop1: DeliveryStopProps = {
      stopId: 'stop-1',
      buyerCode: 'B1',
      buyerName: 'Buyer 1',
      latitude: 24.72,
      longitude: 46.68,
      lists: [{ listNumber: 'L1', buyerCode: 'B1', buyerName: 'Buyer 1', weightKg: 400 }],
      totalWeightKg: 400
    };
    const stop2: DeliveryStopProps = {
      stopId: 'stop-2',
      buyerCode: 'B2',
      buyerName: 'Buyer 2',
      latitude: 24.73,
      longitude: 46.69,
      lists: [{ listNumber: 'L2', buyerCode: 'B2', buyerName: 'Buyer 2', weightKg: 400 }],
      totalWeightKg: 400
    };
    const stop3: DeliveryStopProps = {
      stopId: 'stop-3',
      buyerCode: 'B3',
      buyerName: 'Buyer 3',
      latitude: 24.74,
      longitude: 46.70,
      lists: [{ listNumber: 'L3', buyerCode: 'B3', buyerName: 'Buyer 3', weightKg: 900 }],
      totalWeightKg: 900
    };
    const stopU: DeliveryStopProps = {
      stopId: 'stop-u1',
      buyerCode: 'BU1',
      buyerName: 'Unassigned Buyer',
      latitude: 24.8,
      longitude: 46.8,
      lists: [{ listNumber: 'LU1', buyerCode: 'BU1', buyerName: 'Unassigned Buyer', weightKg: 500 }],
      totalWeightKg: 500
    };

    const dist2 = createMockApprovedDistribution({
      distributionId: 'dist-2',
      revision: 2,
      routes: [
        {
          driverId: 'D1',
          orderedStops: [stop1, stop2],
          totalWeightKg: 800,
          totalDistanceMeters: 14000,
          totalDurationSeconds: 1700,
          utilizationPercent: 80,
          routingStatus: 'OK',
          isManuallyModified: false,
          legs: []
        },
        {
          driverId: 'D2',
          orderedStops: [stop3],
          totalWeightKg: 900,
          totalDistanceMeters: 18000,
          totalDurationSeconds: 2000,
          utilizationPercent: 60,
          routingStatus: 'OK',
          isManuallyModified: false,
          legs: []
        }
      ],
      metrics: {
        initialDistanceMeters: 35000,
        finalDistanceMeters: 32000,
        initialLoadVariance: 120,
        finalLoadVariance: 25,
        finalOptimizationScore: 1600,
        totalDurationSeconds: 3700,
        iterationCount: 50,
        executionDurationMs: 160,
        activeDriversUsed: 2
      },
      unassigned: [stopU]
    });

    const metrics = ReportingDomainService.calculateOperationalMetrics([dist1, dist2]);

    expect(metrics.totalDistributions).toBe(2);
    expect(metrics.totalDeliveredWeightKg).toBe(1700 + 1700); // 1700kg each
    expect(metrics.totalDistanceMeters).toBe(28000 + 32000);
    expect(metrics.totalDrivingTimeSeconds).toBe(3300 + 3700);
    expect(metrics.averageDistancePerDriverMeters).toBe((28000 + 32000) / 4); // 4 routes total
    expect(metrics.averageStopsPerDriver).toBe(1.5); // 6 stops across 4 routes
    expect(metrics.unassignedStopRatePercent).toBeGreaterThan(0);
  });

  it('safely handles empty distributions list without dividing by zero', () => {
    const emptyMetrics = ReportingDomainService.calculateOperationalMetrics([]);

    expect(emptyMetrics.totalDistributions).toBe(0);
    expect(emptyMetrics.totalDeliveredWeightKg).toBe(0);
    expect(emptyMetrics.totalDistanceMeters).toBe(0);
    expect(emptyMetrics.averageLoadUtilizationPercent).toBe(0);
    expect(emptyMetrics.averageStopsPerDriver).toBe(0);
    expect(emptyMetrics.unassignedStopRatePercent).toBe(0);
  });

  it('calculates driver performance metrics accurately for each driver', () => {
    const dist = createMockApprovedDistribution();
    const performance = ReportingDomainService.calculateDriverPerformance([dist]);

    expect(performance.length).toBe(2);
    const d1 = performance.find(p => p.driverId === 'D1');
    const d2 = performance.find(p => p.driverId === 'D2');

    expect(d1).toBeDefined();
    expect(d1?.distributionCount).toBe(1);
    expect(d1?.routeCount).toBe(1);
    expect(d1?.totalStops).toBe(2);
    expect(d1?.totalWeightKg).toBe(800);
    expect(d1?.totalDistanceMeters).toBe(12000);
    expect(d1?.averageUtilizationPercent).toBe(80); // 800 / 1000 = 80%

    expect(d2).toBeDefined();
    expect(d2?.totalStops).toBe(1);
    expect(d2?.totalWeightKg).toBe(900);
    expect(d2?.averageUtilizationPercent).toBe(60); // 900 / 1500 = 60%
  });

  it('calculates differences when comparing two distributions', () => {
    const base = createMockApprovedDistribution({
      revision: 1,
      routes: [
        {
          driverId: 'D1',
          orderedStops: [],
          totalWeightKg: 800,
          totalDistanceMeters: 30000,
          totalDurationSeconds: 3600,
          utilizationPercent: 80,
          isManuallyModified: false,
          routingStatus: 'OK',
          legs: []
        }
      ],
      metrics: {
        initialDistanceMeters: 35000,
        finalDistanceMeters: 30000,
        initialLoadVariance: 100,
        finalLoadVariance: 20,
        finalOptimizationScore: 1500,
        totalDurationSeconds: 3600,
        iterationCount: 50,
        executionDurationMs: 150,
        activeDriversUsed: 1
      },
      optimizationScore: 1500
    });
    const target = createMockApprovedDistribution({
      revision: 2,
      routes: [
        {
          driverId: 'D1',
          orderedStops: [],
          totalWeightKg: 800,
          totalDistanceMeters: 25000,
          totalDurationSeconds: 3000,
          utilizationPercent: 80,
          isManuallyModified: false,
          routingStatus: 'OK',
          legs: []
        }
      ],
      metrics: {
        initialDistanceMeters: 30000,
        finalDistanceMeters: 25000,
        initialLoadVariance: 100,
        finalLoadVariance: 20,
        finalOptimizationScore: 1200,
        totalDurationSeconds: 3000,
        iterationCount: 50,
        executionDurationMs: 150,
        activeDriversUsed: 1
      },
      optimizationScore: 1200
    });

    const comparison = ReportingDomainService.compareDistributions(base, target);

    expect(comparison.baseRevision).toBe(1);
    expect(comparison.targetRevision).toBe(2);
    expect(comparison.differences.distanceDifferenceMeters).toBe(-5000); // 5km saved
    expect(comparison.differences.durationDifferenceSeconds).toBe(-600); // 10min saved
    expect(comparison.differences.scoreDifference).toBe(-300); // Score improved (lower cost)
  });
});
