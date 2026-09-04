import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { validateApproveDistributionPayload, DistributionApprovalValidationError } from './validator';
import { ApprovedDistributionRecord } from './types';

// Initialize Admin SDK once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Server-Authoritative Cloud Function for Approving Distributions (Stage 6.2).
 *
 * Security Guarantees:
 * 1. Authentication Required: request.auth and request.auth.uid must exist.
 * 2. Strict Zero-Trust Payload Validation: All fields, sub-objects, ranges, and domain invariants
 *    are validated server-side. Routes with ROUTING_UNAVAILABLE, duplicate stops, or invalid metrics are rejected.
 * 3. Authoritative Identity: approvedBy is derived exclusively from Firebase Auth token/UID.
 *    Any client-submitted approvedBy is disregarded.
 * 4. Snapshot Immutability Guard: Verifies distribution document does not already exist in Firestore.
 * 5. Monotonic Atomic Revision: Increments server-owned counter (/counters/distribution_revisions)
 *    within an atomic Firestore transaction.
 */
export const approveDistribution = onCall({ cors: true }, async (request) => {
  // 1. Enforce Authentication
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'يجب تسجيل الدخول لإجراء اعتماد خطة التوزيع (Authentication required).'
    );
  }

  // 2. Strict Server-Side Payload & Domain Invariant Validation
  let validatedPayload;
  try {
    validatedPayload = validateApproveDistributionPayload(request.data);
  } catch (validationErr: any) {
    if (validationErr instanceof DistributionApprovalValidationError) {
      throw new HttpsError('invalid-argument', validationErr.message);
    }
    throw new HttpsError('invalid-argument', `خطأ في التحقق من صحة البيانات: ${validationErr?.message || 'Invalid payload'}`);
  }

  const { distributionId } = validatedPayload;
  const counterRef = db.collection('counters').doc('distribution_revisions');
  const distRef = db.collection('distributions').doc(distributionId);

  // 3. Authoritative Identity Resolution (from Firebase Auth ONLY)
  const approverUid = request.auth.uid;
  const approverEmail = (request.auth.token?.email as string | undefined) || null;
  const approverName = (request.auth.token?.name as string | undefined) || null;
  const authoritativeApprovedBy = approverEmail || approverName || approverUid;

  try {
    const finalRecord = await db.runTransaction(async (transaction) => {
      // Step A: Strict Snapshot Immutability Guard
      const distSnap = await transaction.get(distRef);
      if (distSnap.exists) {
        throw new HttpsError(
          'already-exists',
          `خطة التوزيع (${distributionId}) معتمدة مسبقاً وغير قابلة للتعديل أو الاستبدال.`
        );
      }

      // Step B: Atomic Server-Side Counter Read
      const counterSnap = await transaction.get(counterRef);
      let nextRevision = 1;
      if (counterSnap.exists) {
        const counterData = counterSnap.data();
        const currentRev = typeof counterData?.currentRevision === 'number' ? counterData.currentRevision : 0;
        nextRevision = currentRev + 1;
      }

      const nowIso = new Date().toISOString();

      // Step C: Construct Authoritative Record
      const approvedRecord: ApprovedDistributionRecord = {
        ...validatedPayload,
        distributionId,
        approvedAt: nowIso,
        approvedBy: authoritativeApprovedBy,
        approvedByUid: approverUid,
        approvedByEmail: approverEmail,
        revision: nextRevision
      };

      // Step D: Atomically Increment Counter
      transaction.set(
        counterRef,
        {
          currentRevision: nextRevision,
          lastApprovedDistributionId: distributionId,
          lastApprovedAt: nowIso
        },
        { merge: true }
      );

      // Step E: Atomically Write Immutable Distribution Snapshot
      transaction.set(distRef, approvedRecord);

      // Step F: Atomically Write Authoritative DISTRIBUTION_APPROVED Audit Event (Server-Authoritative)
      const auditEventId = `audit-${distributionId}-${nextRevision}`;
      const auditRef = db.collection('auditEvents').doc(auditEventId);
      transaction.set(auditRef, {
        eventId: auditEventId,
        eventType: 'DISTRIBUTION_APPROVED',
        userId: approverUid,
        userEmail: approverEmail,
        distributionId,
        revision: nextRevision,
        createdAt: nowIso,
        metadata: {
          routesCount: approvedRecord.routes.length,
          totalWeightKg: approvedRecord.routes.reduce((sum, r) => sum + r.totalWeightKg, 0),
          stopsCount: approvedRecord.stops.length,
          unassignedCount: approvedRecord.unassigned.length,
          optimizationScore: approvedRecord.optimizationScore
        }
      });

      return approvedRecord;
    });

    return {
      success: true,
      approvedDistribution: finalRecord
    };
  } catch (err: any) {
    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError(
      'internal',
      `فشل تنفيذ اعتماد التوزيع السيرفري: ${err?.message || 'Unknown transaction error'}`
    );
  }
});
