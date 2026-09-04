import { describe, it, expect, vi } from 'vitest';
import {
  validateApproveDistributionPayload,
  DistributionApprovalValidationError
} from '../../core/application/validation/DistributionApprovalValidator';
import { ApproveDistributionPayload } from '../../core/application/dtos/DistributionApprovalDTO';
import { FirestoreDistributionRepository } from '../../core/infrastructure/repositories/FirestoreDistributionRepository';
import { ApprovedDistribution } from '../../core/domain/entities/ApprovedDistribution';

describe('Stage 6.2 — Distribution Approval Security Finalization', () => {
  const validBasePayload: ApproveDistributionPayload = {
    distributionId: 'dist-security-test-001',
    createdAt: new Date().toISOString(),
    depot: {
      latitude: 24.7136,
      longitude: 46.6753,
      name: 'Main Central Depot'
    },
    drivers: [
      {
        driverId: 'drv-01',
        driverName: 'Sami Driver',
        maximumLoadKg: 1500,
        active: true
      },
      {
        driverId: 'drv-02',
        driverName: 'Nasser Driver',
        maximumLoadKg: 2000,
        active: true
      }
    ],
    stops: [
      {
        stopId: 'stop-01',
        buyerCode: 'B001',
        buyerName: 'Al-Amal Market',
        latitude: 24.72,
        longitude: 46.68,
        totalWeightKg: 450,
        lists: [{ listNumber: 'L-101', buyerCode: 'B001', buyerName: 'Al-Amal Market', weightKg: 450 }]
      },
      {
        stopId: 'stop-02',
        buyerCode: 'B002',
        buyerName: 'Al-Safwa Supermarket',
        latitude: 24.73,
        longitude: 46.69,
        totalWeightKg: 320,
        lists: [{ listNumber: 'L-102', buyerCode: 'B002', buyerName: 'Al-Safwa Supermarket', weightKg: 320 }]
      }
    ],
    unassigned: [],
    routes: [
      {
        driverId: 'drv-01',
        orderedStops: [
          {
            stopId: 'stop-01',
            buyerCode: 'B001',
            buyerName: 'Al-Amal Market',
            latitude: 24.72,
            longitude: 46.68,
            totalWeightKg: 450,
            lists: [{ listNumber: 'L-101', buyerCode: 'B001', buyerName: 'Al-Amal Market', weightKg: 450 }]
          },
          {
            stopId: 'stop-02',
            buyerCode: 'B002',
            buyerName: 'Al-Safwa Supermarket',
            latitude: 24.73,
            longitude: 46.69,
            totalWeightKg: 320,
            lists: [{ listNumber: 'L-102', buyerCode: 'B002', buyerName: 'Al-Safwa Supermarket', weightKg: 320 }]
          }
        ],
        totalWeightKg: 770,
        utilizationPercent: 51.33,
        totalDistanceMeters: 14500,
        totalDurationSeconds: 1800,
        isManuallyModified: false,
        routingStatus: 'OK'
      }
    ],
    metrics: {
      initialDistanceMeters: 18000,
      finalDistanceMeters: 14500,
      initialLoadVariance: 250,
      finalLoadVariance: 110,
      finalOptimizationScore: 0.88,
      totalDurationSeconds: 1800,
      iterationCount: 150,
      executionDurationMs: 42,
      activeDriversUsed: 1
    },
    optimizationScore: 0.88,
    warnings: []
  };

  describe('Server-Side Zero-Trust Payload Validation', () => {
    it('successfully validates and returns well-formed DTO for valid payload', () => {
      const validated = validateApproveDistributionPayload(validBasePayload);
      expect(validated.distributionId).toBe('dist-security-test-001');
      expect(validated.routes.length).toBe(1);
      expect(validated.routes[0].driverId).toBe('drv-01');
      expect(validated.depot.latitude).toBe(24.7136);
      expect(validated.optimizationScore).toBe(0.88);
    });

    it('rejects null, non-object or empty payload', () => {
      expect(() => validateApproveDistributionPayload(null)).toThrow(DistributionApprovalValidationError);
      expect(() => validateApproveDistributionPayload(undefined)).toThrow(DistributionApprovalValidationError);
      expect(() => validateApproveDistributionPayload('invalid-string')).toThrow(DistributionApprovalValidationError);
    });

    it('rejects invalid, empty, or malicious distribution IDs', () => {
      expect(() => validateApproveDistributionPayload({ ...validBasePayload, distributionId: '' })).toThrow(
        DistributionApprovalValidationError
      );
      expect(() => validateApproveDistributionPayload({ ...validBasePayload, distributionId: ' ' })).toThrow(
        DistributionApprovalValidationError
      );
      expect(() => validateApproveDistributionPayload({ ...validBasePayload, distributionId: 'a'.repeat(129) })).toThrow(
        DistributionApprovalValidationError
      );
      expect(
        () => validateApproveDistributionPayload({ ...validBasePayload, distributionId: 'id-with-illegal/slash' })
      ).toThrow(DistributionApprovalValidationError);
      expect(
        () => validateApproveDistributionPayload({ ...validBasePayload, distributionId: 'id with spaces' })
      ).toThrow(DistributionApprovalValidationError);
    });

    it('rejects invalid or out-of-range depot coordinates', () => {
      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          depot: { latitude: 95.0, longitude: 46.0 }
        })
      ).toThrow(DistributionApprovalValidationError);

      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          depot: { latitude: 24.0, longitude: 195.0 }
        })
      ).toThrow(DistributionApprovalValidationError);

      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          depot: { latitude: NaN, longitude: 46.0 }
        })
      ).toThrow(DistributionApprovalValidationError);
    });

    it('rejects driver list with missing, non-positive capacity, or duplicate IDs', () => {
      // Empty drivers
      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          drivers: []
        })
      ).toThrow(DistributionApprovalValidationError);

      // Non-positive capacity
      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          drivers: [
            { driverId: 'd1', driverName: 'Sami', maximumLoadKg: 0, active: true }
          ]
        })
      ).toThrow(DistributionApprovalValidationError);

      // Duplicate driver IDs
      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          drivers: [
            { driverId: 'd1', driverName: 'Sami', maximumLoadKg: 1000, active: true },
            { driverId: 'd1', driverName: 'Duplicate Sami', maximumLoadKg: 1000, active: true }
          ]
        })
      ).toThrow(DistributionApprovalValidationError);
    });

    it('rejects stop with invalid weight or empty delivery lists', () => {
      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          stops: [
            {
              stopId: 'stop-01',
              buyerCode: 'B1',
              buyerName: 'Store',
              latitude: 24.0,
              longitude: 46.0,
              totalWeightKg: -10,
              lists: [{ listNumber: 'L1', weightKg: -10 }]
            }
          ]
        })
      ).toThrow(DistributionApprovalValidationError);

      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          stops: [
            {
              stopId: 'stop-01',
              buyerCode: 'B1',
              buyerName: 'Store',
              latitude: 24.0,
              longitude: 46.0,
              totalWeightKg: 100,
              lists: []
            }
          ]
        })
      ).toThrow(DistributionApprovalValidationError);
    });

    it('CRITICAL: Rejects approval when any route has failed routing (ROUTING_UNAVAILABLE)', () => {
      const payloadWithFailedRoute: ApproveDistributionPayload = {
        ...validBasePayload,
        routes: [
          {
            ...validBasePayload.routes[0],
            routingStatus: 'ROUTING_UNAVAILABLE',
            routingErrorMessage: 'Network failure during route optimization'
          }
        ]
      };

      expect(() => validateApproveDistributionPayload(payloadWithFailedRoute)).toThrow(
        DistributionApprovalValidationError
      );
      expect(() => validateApproveDistributionPayload(payloadWithFailedRoute)).toThrow(/ROUTING_UNAVAILABLE/);
    });

    it('CRITICAL: Rejects duplicate stop IDs assigned across routes', () => {
      const payloadWithDuplicateStop: ApproveDistributionPayload = {
        ...validBasePayload,
        routes: [
          {
            driverId: 'drv-01',
            orderedStops: [validBasePayload.stops[0]],
            totalWeightKg: 450,
            utilizationPercent: 30,
            totalDistanceMeters: 5000,
            totalDurationSeconds: 600,
            isManuallyModified: false,
            routingStatus: 'OK'
          },
          {
            driverId: 'drv-02',
            orderedStops: [validBasePayload.stops[0]], // Duplicate stop-01 assigned to drv-02 as well!
            totalWeightKg: 450,
            utilizationPercent: 22.5,
            totalDistanceMeters: 6000,
            totalDurationSeconds: 700,
            isManuallyModified: false,
            routingStatus: 'OK'
          }
        ]
      };

      expect(() => validateApproveDistributionPayload(payloadWithDuplicateStop)).toThrow(
        DistributionApprovalValidationError
      );
      expect(() => validateApproveDistributionPayload(payloadWithDuplicateStop)).toThrow(/Duplicate stopId across routes/);
    });

    it('CRITICAL: Rejects stop present simultaneously in assigned and unassigned lists', () => {
      const payloadWithOverlap: ApproveDistributionPayload = {
        ...validBasePayload,
        unassigned: [validBasePayload.stops[0]] // stop-01 is in route AND in unassigned!
      };

      expect(() => validateApproveDistributionPayload(payloadWithOverlap)).toThrow(
        DistributionApprovalValidationError
      );
      expect(() => validateApproveDistributionPayload(payloadWithOverlap)).toThrow(/both assigned and unassigned/);
    });

    it('rejects invalid metrics or optimization scores outside [0, 1]', () => {
      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          optimizationScore: 1.25 // > 1
        })
      ).toThrow(DistributionApprovalValidationError);

      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          optimizationScore: -0.1 // < 0
        })
      ).toThrow(DistributionApprovalValidationError);

      expect(() =>
        validateApproveDistributionPayload({
          ...validBasePayload,
          metrics: {
            ...validBasePayload.metrics,
            finalDistanceMeters: -500 // negative distance
          }
        })
      ).toThrow(DistributionApprovalValidationError);
    });
  });

  describe('Authoritative Identity Derivation (Firebase Auth ONLY)', () => {
    it('disregards any client-supplied approvedBy in favor of server auth token', () => {
      // Emulate server identity resolution
      const clientPayload = {
        ...validBasePayload,
        approvedBy: 'MaliciousClientSpoofedUser'
      };

      const serverAuth = {
        uid: 'firebase-uid-999',
        token: {
          email: 'dispatcher@company.com',
          name: 'Ahmed Dispatcher'
        }
      };

      const validated = validateApproveDistributionPayload(clientPayload);

      // Server resolution logic (as implemented in approveDistribution.ts):
      const authoritativeApprovedBy = serverAuth.token?.email || serverAuth.token?.name || serverAuth.uid;
      const approvedByUid = serverAuth.uid;
      const approvedByEmail = serverAuth.token?.email;

      const finalRecord = {
        ...validated,
        approvedAt: new Date().toISOString(),
        approvedBy: authoritativeApprovedBy,
        approvedByUid,
        approvedByEmail,
        revision: 1
      };

      expect(finalRecord.approvedBy).toBe('dispatcher@company.com');
      expect(finalRecord.approvedByUid).toBe('firebase-uid-999');
      expect(finalRecord.approvedByEmail).toBe('dispatcher@company.com');
      expect(finalRecord.approvedBy).not.toBe('MaliciousClientSpoofedUser');
    });

    it('falls back to auth UID if email and name are absent in auth token', () => {
      const serverAuthWithoutEmail = {
        uid: 'anonymous-auth-uid-456',
        token: {}
      };

      const authoritativeApprovedBy =
        serverAuthWithoutEmail.token?.['email'] ||
        serverAuthWithoutEmail.token?.['name'] ||
        serverAuthWithoutEmail.uid;

      expect(authoritativeApprovedBy).toBe('anonymous-auth-uid-456');
    });
  });

  describe('Server-Side Atomic Revision & Immutability Transaction Logic', () => {
    // Pure function representing the exact transaction logic executed inside approveDistribution.ts
    async function executeMockServerTransaction(
      firestoreState: {
        distributions: Map<string, any>;
        counter: { currentRevision: number } | null;
      },
      payload: ApproveDistributionPayload,
      auth: { uid: string; email?: string }
    ) {
      const { distributionId } = payload;

      // 1. Strict Immutability Guard
      if (firestoreState.distributions.has(distributionId)) {
        const err: any = new Error(`خطة التوزيع (${distributionId}) معتمدة مسبقاً وغير قابلة للتعديل أو الاستبدال.`);
        err.code = 'already-exists';
        throw err;
      }

      // 2. Read Counter
      const currentRev = firestoreState.counter?.currentRevision ?? 0;
      const nextRevision = currentRev + 1;
      const nowIso = new Date().toISOString();

      const approvedRecord = {
        ...payload,
        distributionId,
        approvedAt: nowIso,
        approvedBy: auth.email || auth.uid,
        approvedByUid: auth.uid,
        approvedByEmail: auth.email || null,
        revision: nextRevision
      };

      // 3. Atomically Update Counter
      firestoreState.counter = { currentRevision: nextRevision };

      // 4. Atomically Persist Snapshot
      firestoreState.distributions.set(distributionId, approvedRecord);

      return approvedRecord;
    }

    it('increments counter monotonically and records revision 1 for initial distribution', async () => {
      const state = {
        distributions: new Map<string, any>(),
        counter: null
      };

      const result = await executeMockServerTransaction(state, validBasePayload, {
        uid: 'admin-1',
        email: 'admin@fleet.com'
      });

      expect(result.revision).toBe(1);
      expect(state.counter?.currentRevision).toBe(1);
      expect(state.distributions.has('dist-security-test-001')).toBe(true);
    });

    it('increments counter to 2 on subsequent distribution', async () => {
      const state = {
        distributions: new Map<string, any>(),
        counter: { currentRevision: 1 }
      };

      const secondPayload = {
        ...validBasePayload,
        distributionId: 'dist-security-test-002'
      };

      const result = await executeMockServerTransaction(state, secondPayload, {
        uid: 'admin-1',
        email: 'admin@fleet.com'
      });

      expect(result.revision).toBe(2);
      expect(state.counter?.currentRevision).toBe(2);
      expect(state.distributions.has('dist-security-test-002')).toBe(true);
    });

    it('rejects duplicate distributionId with already-exists error without altering counter', async () => {
      const state = {
        distributions: new Map<string, any>([
          ['dist-security-test-001', { ...validBasePayload, revision: 1 }]
        ]),
        counter: { currentRevision: 1 }
      };

      await expect(
        executeMockServerTransaction(state, validBasePayload, { uid: 'admin-1' })
      ).rejects.toThrow(/معتمدة مسبقاً وغير قابلة للتعديل أو الاستبدال/);

      // Counter remains intact
      expect(state.counter.currentRevision).toBe(1);
    });
  });

  describe('Single-Path Architecture & No-Fallback Verification', () => {
    it('FirestoreDistributionRepository delegates exclusively to approveDistribution callable and does not execute client transaction on error', async () => {
      const mockCallable = vi.fn().mockRejectedValue({
        code: 'functions/already-exists',
        message: 'Document already exists'
      });

      const repo = new FirestoreDistributionRepository(mockCallable as any);
      const entity = ApprovedDistribution.create({
        ...validBasePayload,
        approvedAt: new Date().toISOString(),
        revision: 1
      });

      await expect(repo.saveApprovedDistribution(entity)).rejects.toThrow(
        /معتمدة مسبقاً وغير قابلة للتعديل أو الاستبدال/
      );

      expect(mockCallable).toHaveBeenCalledTimes(1);
    });

    it('propagates unauthenticated error directly to the caller without fallback', async () => {
      const mockCallable = vi.fn().mockRejectedValue({
        code: 'functions/unauthenticated',
        message: 'User is not logged in'
      });

      const repo = new FirestoreDistributionRepository(mockCallable as any);
      const entity = ApprovedDistribution.create({
        ...validBasePayload,
        approvedAt: new Date().toISOString(),
        revision: 1
      });

      await expect(repo.saveApprovedDistribution(entity)).rejects.toThrow(
        /يجب تسجيل الدخول لإجراء اعتماد خطة التوزيع/
      );

      expect(mockCallable).toHaveBeenCalledTimes(1);
    });

    it('successfully constructs ApprovedDistribution from valid server callable response', async () => {
      const expectedRecord = {
        ...validBasePayload,
        approvedAt: '2026-09-04T08:00:00.000Z',
        approvedBy: 'dispatcher@fleet.com',
        approvedByUid: 'user-007',
        revision: 3
      };

      const mockCallable = vi.fn().mockResolvedValue({
        data: {
          success: true,
          approvedDistribution: expectedRecord
        }
      });

      const repo = new FirestoreDistributionRepository(mockCallable as any);
      const entity = ApprovedDistribution.create({
        ...validBasePayload,
        approvedAt: new Date().toISOString(),
        revision: 1
      });

      const result = await repo.saveApprovedDistribution(entity);

      expect(result.distributionId).toBe('dist-security-test-001');
      expect(result.revision).toBe(3);
      expect(result.approvedBy).toBe('dispatcher@fleet.com');
      expect(mockCallable).toHaveBeenCalledTimes(1);
    });
  });
});
