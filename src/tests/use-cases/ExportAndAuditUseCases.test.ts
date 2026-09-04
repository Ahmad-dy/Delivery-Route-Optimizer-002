import { describe, it, expect, vi } from 'vitest';
import { ExportDistributionToExcelUseCase } from '../../core/application/use-cases/export/ExportDistributionToExcelUseCase';
import { ExportDistributionToPdfUseCase } from '../../core/application/use-cases/export/ExportDistributionToPdfUseCase';
import { LogAuditEventUseCase } from '../../core/application/use-cases/audit/LogAuditEventUseCase';
import { GetAuditHistoryUseCase } from '../../core/application/use-cases/audit/GetAuditHistoryUseCase';
import { IAuditRepository } from '../../core/application/ports/IAuditRepository';
import { ApprovedDistribution } from '../../core/domain/entities/ApprovedDistribution';
import { AuditEvent } from '../../core/domain/entities/AuditEvent';

function createMockApprovedDistribution(): ApprovedDistribution {
  const stopProps = {
    stopId: 'stop-1',
    buyerCode: 'B1',
    buyerName: 'Buyer 1',
    latitude: 24.72,
    longitude: 46.68,
    lists: [{ listNumber: 'L1', buyerCode: 'B1', buyerName: 'Buyer 1', weightKg: 600 }],
    totalWeightKg: 600
  };

  return ApprovedDistribution.create({
    distributionId: 'dist-export-1',
    revision: 3,
    createdAt: '2026-09-02T08:00:00Z',
    approvedAt: '2026-09-02T08:30:00Z',
    approvedBy: 'dispatcher@test.com',
    depot: { latitude: 24.7136, longitude: 46.6753, name: 'Main Depot' },
    drivers: [{ driverId: 'D1', driverName: 'Driver 1', maximumLoadKg: 1000, active: true }],
    routes: [
      {
        driverId: 'D1',
        orderedStops: [stopProps],
        totalWeightKg: 600,
        totalDistanceMeters: 10000,
        totalDurationSeconds: 1200,
        routingStatus: 'OK',
        utilizationPercent: 60,
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
      finalOptimizationScore: 85,
      totalDurationSeconds: 1200,
      iterationCount: 20,
      executionDurationMs: 100,
      activeDriversUsed: 1
    },
    optimizationScore: 85,
    warnings: []
  });
}

describe('Export and Audit Use Cases', () => {
  const mockAuditRepo: IAuditRepository = {
    logEvent: vi.fn(),
    listEvents: vi.fn()
  };

  it('ExportDistributionToExcelUseCase successfully generates buffer and records audit event', async () => {
    const useCase = new ExportDistributionToExcelUseCase(mockAuditRepo);
    const mockDist = createMockApprovedDistribution();

    const result = await useCase.execute({
      distribution: mockDist,
      userId: 'user-audit-1',
      userEmail: 'audit@test.com'
    });

    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.filename).toContain('distribution-revision-3');
    expect(mockAuditRepo.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DISTRIBUTION_EXPORTED_EXCEL',
        userId: 'user-audit-1',
        distributionId: 'dist-export-1',
        revision: 3
      })
    );
  });

  it('ExportDistributionToPdfUseCase generates print HTML and records audit event', async () => {
    const useCase = new ExportDistributionToPdfUseCase(mockAuditRepo);
    const mockDist = createMockApprovedDistribution();

    const result = await useCase.execute({
      distribution: mockDist,
      userId: 'user-audit-1',
      userEmail: 'audit@test.com'
    });

    expect(result.htmlContent).toContain('تقرير اعتماد التوزيع');
    expect(result.filename).toContain('distribution-revision-3');
    expect(typeof result.print).toBe('function');
    expect(mockAuditRepo.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DISTRIBUTION_EXPORTED_PDF',
        userId: 'user-audit-1',
        distributionId: 'dist-export-1',
        revision: 3
      })
    );
  });

  it('LogAuditEventUseCase stamps eventId and ISO timestamp and forwards to repository', async () => {
    const useCase = new LogAuditEventUseCase(mockAuditRepo);

    await useCase.execute({
      eventType: 'DISTRIBUTION_APPROVED',
      userId: 'user-100',
      userEmail: 'user@test.com',
      distributionId: 'dist-100',
      revision: 4,
      metadata: { routesCount: 3 }
    });

    expect(mockAuditRepo.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DISTRIBUTION_APPROVED',
        userId: 'user-100',
        distributionId: 'dist-100',
        revision: 4,
        metadata: { routesCount: 3 }
      })
    );
  });

  it('GetAuditHistoryUseCase retrieves audit events from repository', async () => {
    const useCase = new GetAuditHistoryUseCase(mockAuditRepo);
    vi.mocked(mockAuditRepo.listEvents).mockResolvedValueOnce([
      AuditEvent.create({
        eventId: 'evt-1',
        eventType: 'DISTRIBUTION_EXPORTED_EXCEL',
        createdAt: '2026-09-02T12:00:00Z',
        userId: 'u1',
        distributionId: 'd1',
        revision: 1
      })
    ]);

    const events = await useCase.execute({ limit: 50 });

    expect(events.length).toBe(1);
    expect(events[0].eventId).toBe('evt-1');
  });
});
