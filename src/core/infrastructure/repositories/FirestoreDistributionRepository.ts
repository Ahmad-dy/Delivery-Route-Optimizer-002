import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  getCountFromServer,
  QueryConstraint
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebaseApp';
import { handleFirestoreError, OperationType } from '../firebase/firestoreErrorHandler';
import { ApprovedDistribution, ApprovedDistributionProps } from '../../domain/entities/ApprovedDistribution';
import { DistributionRepository } from '../../application/ports/DistributionRepository';
import {
  IDistributionHistoryRepository,
  HistoryPaginationResult
} from '../../application/ports/IDistributionHistoryRepository';
import { DistributionHistoryFilter, ReportingDomainService } from '../../domain/entities/ReportingEntities';
import { ApproveDistributionPayload } from '../../application/dtos/DistributionApprovalDTO';

export type ApproveCallable = (
  payload: ApproveDistributionPayload
) => Promise<{ data: { success: boolean; approvedDistribution: ApprovedDistributionProps } }>;

export class FirestoreDistributionRepository implements DistributionRepository, IDistributionHistoryRepository {
  private static readonly COLLECTION = 'distributions';
  private readonly customApproveCallable?: ApproveCallable;

  constructor(customApproveCallable?: ApproveCallable) {
    this.customApproveCallable = customApproveCallable;
  }

  /**
   * Saves an approved distribution snapshot exclusively through the Server-Authoritative Cloud Function.
   * There is strictly NO client-side direct Firestore transaction fallback to ensure absolute revision integrity,
   * server-side schema verification, and snapshot immutability.
   */
  public async saveApprovedDistribution(distribution: ApprovedDistribution): Promise<ApprovedDistribution> {
    const docPath = `${FirestoreDistributionRepository.COLLECTION}/${distribution.distributionId}`;
    try {
      const approveFn = this.customApproveCallable || httpsCallable<
        ApproveDistributionPayload,
        { success: boolean; approvedDistribution: ApprovedDistributionProps }
      >(functions, 'approveDistribution');

      const response = await approveFn(distribution.toJSON());
      if (!response?.data?.approvedDistribution) {
        throw new Error('فشل استلام بيانات التوزيع المعتمد من السيرفر.');
      }

      return ApprovedDistribution.create(response.data.approvedDistribution);
    } catch (error: any) {
      const code = error?.code;
      if (code === 'functions/already-exists' || code === 'already-exists') {
        throw new Error(`خطة التوزيع (${distribution.distributionId}) معتمدة مسبقاً وغير قابلة للتعديل أو الاستبدال.`);
      }
      if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
        throw new Error('يجب تسجيل الدخول لإجراء اعتماد خطة التوزيع.');
      }
      if (code === 'functions/invalid-argument' || code === 'invalid-argument') {
        throw new Error(error?.message || 'بيانات اعتماد التوزيع غير صالحة ولا تطابق معايير الأمان.');
      }

      handleFirestoreError(error, OperationType.WRITE, docPath);
      throw error;
    }
  }

  public async getApprovedDistribution(distributionId: string): Promise<ApprovedDistribution | null> {
    return this.getApprovedDistributionById(distributionId);
  }

  public async getApprovedDistributionById(distributionId: string): Promise<ApprovedDistribution | null> {
    const docPath = `${FirestoreDistributionRepository.COLLECTION}/${distributionId}`;
    try {
      const docRef = doc(db, FirestoreDistributionRepository.COLLECTION, distributionId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      const data = snapshot.data() as ApprovedDistributionProps;
      return ApprovedDistribution.create(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
      return null;
    }
  }

  public async getApprovedDistributionByRevision(revision: number): Promise<ApprovedDistribution | null> {
    try {
      const colRef = collection(db, FirestoreDistributionRepository.COLLECTION);
      const q = query(colRef, where('revision', '==', revision), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      const data = snapshot.docs[0].data() as ApprovedDistributionProps;
      return ApprovedDistribution.create(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, FirestoreDistributionRepository.COLLECTION);
      return null;
    }
  }

  public async listApprovedDistributions(): Promise<readonly ApprovedDistribution[]> {
    try {
      const colRef = collection(db, FirestoreDistributionRepository.COLLECTION);
      const q = query(colRef, orderBy('approvedAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const list: ApprovedDistribution[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ApprovedDistributionProps;
          list.push(ApprovedDistribution.create(data));
        }
      });
      return Object.freeze(list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, FirestoreDistributionRepository.COLLECTION);
      return Object.freeze([]);
    }
  }

  /**
   * Performs True Firestore Cursor-Based Pagination & Direct Indexable Filtering.
   * Eliminates in-memory truncation limits and supports arbitrary historical dataset volumes.
   */
  public async listHistory(
    filter?: DistributionHistoryFilter,
    pagination?: { limit: number; cursor?: string; direction?: 'next' | 'prev' }
  ): Promise<HistoryPaginationResult> {
    const pageSize = pagination?.limit ?? 20;

    try {
      const colRef = collection(db, FirestoreDistributionRepository.COLLECTION);
      const filterConstraints: QueryConstraint[] = [];

      // 1. Revision Filter (Direct Firestore Equality)
      if (typeof filter?.revision === 'number') {
        filterConstraints.push(where('revision', '==', filter.revision));
      }

      // 2. Strict Calendar Date Boundaries Filter
      let startIso: string | undefined;
      let endIso: string | undefined;

      if (filter?.startDate || filter?.endDate) {
        if (filter.startDate) startIso = `${filter.startDate}T00:00:00.000Z`;
        if (filter.endDate) endIso = `${filter.endDate}T23:59:59.999Z`;
      } else if (filter?.datePreset) {
        const range = ReportingDomainService.resolveCalendarDateRange(filter.datePreset);
        startIso = range.startDate;
        endIso = range.endDate;
      }

      if (startIso) {
        filterConstraints.push(where('approvedAt', '>=', startIso));
      }
      if (endIso) {
        filterConstraints.push(where('approvedAt', '<=', endIso));
      }

      // 3. Driver Filter
      if (filter?.driverId && filter.driverId.trim().length > 0) {
        filterConstraints.push(where('activeDriverIds', 'array-contains', filter.driverId.trim()));
      }

      // 4. Order by approvedAt descending
      const orderConstraint = orderBy('approvedAt', 'desc');

      // 5. Query Total Count directly from Firestore Server
      let totalCount = 0;
      try {
        const countQuery = query(colRef, ...filterConstraints);
        const countSnap = await getCountFromServer(countQuery);
        totalCount = countSnap.data().count;
      } catch {
        // Fallback if count query is unavailable in offline mock
      }

      // 6. Build Pagination Query with startAfter Cursor Document Snapshot
      const pageConstraints: QueryConstraint[] = [...filterConstraints, orderConstraint];

      if (pagination?.cursor) {
        try {
          const cursorRef = doc(db, FirestoreDistributionRepository.COLLECTION, pagination.cursor);
          const cursorDocSnap = await getDoc(cursorRef);
          if (cursorDocSnap.exists()) {
            pageConstraints.push(startAfter(cursorDocSnap));
          }
        } catch (cursorErr) {
          console.warn('Unable to load cursor document snapshot:', pagination.cursor, cursorErr);
        }
      }

      // Query pageSize + 1 to detect if a next page exists without full count overhead
      pageConstraints.push(limit(pageSize + 1));

      const pageQuery = query(colRef, ...pageConstraints);
      const snapshot = await getDocs(pageQuery);

      const items: ApprovedDistribution[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ApprovedDistributionProps;
          items.push(ApprovedDistribution.create(data));
        }
      });

      // 7. Optional in-memory substring filtering for text search if provided (e.g. distributionId substring)
      let filteredItems = items;
      if (filter?.distributionId && filter.distributionId.trim().length > 0) {
        const needle = filter.distributionId.trim().toLowerCase();
        filteredItems = filteredItems.filter(d => d.distributionId.toLowerCase().includes(needle));
      }

      const hasMore = filteredItems.length > pageSize;
      const paginatedItems = hasMore ? filteredItems.slice(0, pageSize) : filteredItems;
      const nextCursor = hasMore && paginatedItems.length > 0
        ? paginatedItems[paginatedItems.length - 1].distributionId
        : undefined;

      if (totalCount === 0 && paginatedItems.length > 0) {
        totalCount = paginatedItems.length;
      }

      return {
        items: Object.freeze(paginatedItems),
        totalCount: Math.max(totalCount, paginatedItems.length),
        nextCursor,
        prevCursor: pagination?.cursor,
        hasMore
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, FirestoreDistributionRepository.COLLECTION);
      return {
        items: Object.freeze([]),
        totalCount: 0,
        hasMore: false
      };
    }
  }

  public async getAllForReporting(filter?: {
    startDate?: string;
    endDate?: string;
    datePreset?: string;
  }): Promise<readonly ApprovedDistribution[]> {
    try {
      const colRef = collection(db, FirestoreDistributionRepository.COLLECTION);
      const constraints: QueryConstraint[] = [];

      let startIso = filter?.startDate ? `${filter.startDate}T00:00:00.000Z` : undefined;
      let endIso = filter?.endDate ? `${filter.endDate}T23:59:59.999Z` : undefined;

      if (!startIso && !endIso && filter?.datePreset) {
        const range = ReportingDomainService.resolveCalendarDateRange(filter.datePreset);
        startIso = range.startDate;
        endIso = range.endDate;
      }

      if (startIso) {
        constraints.push(where('approvedAt', '>=', startIso));
      }
      if (endIso) {
        constraints.push(where('approvedAt', '<=', endIso));
      }

      constraints.push(orderBy('approvedAt', 'desc'));

      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);

      const list: ApprovedDistribution[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ApprovedDistributionProps;
          list.push(ApprovedDistribution.create(data));
        }
      });

      return Object.freeze(list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, FirestoreDistributionRepository.COLLECTION);
      return Object.freeze([]);
    }
  }
}

export { FirestoreDistributionRepository as FirestoreDistributionHistoryRepository };

