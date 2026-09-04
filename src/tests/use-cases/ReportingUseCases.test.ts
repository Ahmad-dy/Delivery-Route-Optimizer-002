import { describe, it, expect, vi } from 'vitest';
import { GetDistributionHistoryUseCase } from '../../core/application/use-cases/reporting/GetDistributionHistoryUseCase';
import { GetDistributionDetailsUseCase } from '../../core/application/use-cases/reporting/GetDistributionDetailsUseCase';
import { CompareDistributionsUseCase } from '../../core/application/use-cases/reporting/CompareDistributionsUseCase';
import { GetDriverPerformanceUseCase } from '../../core/application/use-cases/reporting/GetDriverPerformanceUseCase';
import { GetOperationalReportsUseCase } from '../../core/application/use-cases/reporting/GetOperationalReportsUseCase';
import { IDistributionHistoryRepository } from '../../core/application/ports/IDistributionHistoryRepository';
import { IAuditRepository } from '../../core/application/ports/IAuditRepository';
import { ApprovedDistribution } from '../../core/domain/entities/ApprovedDistribution';

function createMockDistribution(id: string, rev: number): ApprovedDistribution {
  const stopProps = {
    stopId: 'stop-1',
    buyerCode: 'B1',
    buyerName: 'Buyer 1',
    latitude: 24.71,
    longitude: 46.71,
    lists: [{ listNumber: 'L1', buyerCode: 'B1', buyerName: 'Buyer 1', weightKg: 500 }],
    totalWeightKg: 500
  };

  return ApprovedDistribution.create({
    distributionId: id,
    revision: rev,
    createdAt: '2026-09-01T10:00:00Z',
    approvedAt: '2026-09-01T10:15:00Z',
    approvedBy: 'dispatcher@test.com',
    depot: { latitude: 24.7, longitude: 46.7, name: 'Depot' },
    drivers: [{ driverId: 'D1', driverName: 'Driver 1', maximumLoadKg: 1000, active: true }],
    routes: [
      {
        driverId: 'D1',
        orderedStops: [stopProps],
        totalWeightKg: 500,
        totalDistanceMeters: 10000,
        totalDurationSeconds: 1200,
        routingStatus: 'OK',
        utilizationPercent: 50,
        isManuallyModified: false,
        legs: []
      }
    ],
    stops: [stopProps],
    unassigned: [],
    metrics: {
      initialDistanceMeters: 12000,
      finalDistanceMeters: 10000,
      initialLoadVariance: 50,
      finalLoadVariance: 10,
      finalOptimizationScore: 80,
      totalDurationSeconds: 1200,
      iterationCount: 20,
      executionDurationMs: 100,
      activeDriversUsed: 1
    },
    optimizationScore: 80,
    warnings: []
  });
}

describe('Reporting Use Cases', () => {
  const mockHistoryRepo: IDistributionHistoryRepository = {
    getApprovedDistributionById: vi.fn(),
    getApprovedDistributionByRevision: vi.fn(),
    listHistory: vi.fn(),
    getAllForReporting: vi.fn()
  };

  const mockAuditRepo: IAuditRepository = {
    logEvent: vi.fn(),
    listEvents: vi.fn()
  };

  it('GetDistributionHistoryUseCase queries repository with filter and pagination', async () => {
    const useCase = new GetDistributionHistoryUseCase(mockHistoryRepo);
    const mockItems = [createMockDistribution('dist-1', 1)];

    vi.mocked(mockHistoryRepo.listHistory).mockResolvedValueOnce({
      items: mockItems,
      totalCount: 1,
      hasMore: false
    });

    const result = await useCase.execute({
      filter: { driverId: 'D1' },
      limit: 10
    });

    expect(result.items.length).toBe(1);
    expect(mockHistoryRepo.listHistory).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: 'D1' }),
      { limit: 10, cursor: undefined, direction: undefined }
    );
  });

  it('GetDistributionDetailsUseCase retrieves distribution and logs audit event', async () => {
    const useCase = new GetDistributionDetailsUseCase(mockHistoryRepo, mockAuditRepo);
    const mockDist = createMockDistribution('dist-1', 1);

    vi.mocked(mockHistoryRepo.getApprovedDistributionById).mockResolvedValueOnce(mockDist);

    const result = await useCase.execute({
      distributionId: 'dist-1',
      requestingUserId: 'user-123',
      requestingUserEmail: 'user@test.com'
    });

    expect(result.distributionId).toBe('dist-1');
    expect(mockAuditRepo.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DISTRIBUTION_VIEWED',
        userId: 'user-123',
        distributionId: 'dist-1',
        revision: 1
      })
    );
  });

  it('CompareDistributionsUseCase compares two valid distributions', async () => {
    const useCase = new CompareDistributionsUseCase(mockHistoryRepo);
    const baseDist = createMockDistribution('dist-1', 1);
    const targetDist = createMockDistribution('dist-2', 2);

    vi.mocked(mockHistoryRepo.getApprovedDistributionByRevision).mockImplementation(async (rev) => {
      if (rev === 1) return baseDist;
      if (rev === 2) return targetDist;
      return null;
    });

    const comparison = await useCase.execute({
      baseIdentifier: { revision: 1 },
      targetIdentifier: { revision: 2 }
    });

    expect(comparison.baseRevision).toBe(1);
    expect(comparison.targetRevision).toBe(2);
    expect(comparison.differences).toBeDefined();
  });

  it('CompareDistributionsUseCase rejects comparing a revision with itself', async () => {
    const useCase = new CompareDistributionsUseCase(mockHistoryRepo);

    await expect(
      useCase.execute({
        baseIdentifier: { revision: 1 },
        targetIdentifier: { revision: 1 }
      })
    ).rejects.toThrow();
  });

  it('GetOperationalReportsUseCase aggregates operational metrics for chosen filter', async () => {
    const useCase = new GetOperationalReportsUseCase(mockHistoryRepo);
    vi.mocked(mockHistoryRepo.getAllForReporting).mockResolvedValueOnce([
      createMockDistribution('dist-1', 1)
    ]);

    const metrics = await useCase.execute({ periodPreset: '30days' });

    expect(metrics.totalDistributions).toBe(1);
    expect(metrics.totalDeliveredWeightKg).toBe(500);
  });

  it('GetDriverPerformanceUseCase computes driver metrics for chosen filter', async () => {
    const useCase = new GetDriverPerformanceUseCase(mockHistoryRepo);
    vi.mocked(mockHistoryRepo.getAllForReporting).mockResolvedValueOnce([
      createMockDistribution('dist-1', 1)
    ]);

    const driverMetrics = await useCase.execute({ periodPreset: '30days' });

    expect(driverMetrics.length).toBe(1);
    expect(driverMetrics[0].driverId).toBe('D1');
    expect(driverMetrics[0].totalStops).toBe(1);
  });
});
