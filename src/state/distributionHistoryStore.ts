import { create } from 'zustand';
import { container } from '../core/application/di/container';
import { ApprovedDistribution } from '../core/domain/entities/ApprovedDistribution';
import {
  DistributionHistoryFilter,
  ReportFilter,
  OperationalMetrics,
  DriverPerformanceMetrics,
  DistributionComparisonResult
} from '../core/domain/entities/ReportingEntities';
import { useAuthStore } from './authStore';

export interface DistributionHistoryState {
  // History List State
  historyItems: readonly ApprovedDistribution[];
  isLoadingHistory: boolean;
  historyError: string | null;
  activeFilter: DistributionHistoryFilter;
  pagination: {
    limit: number;
    cursor?: string;
    nextCursor?: string;
    prevCursor?: string;
    totalCount: number;
    hasMore: boolean;
  };

  // Details View State
  selectedDistribution: ApprovedDistribution | null;
  isLoadingDetails: boolean;
  detailsError: string | null;

  // Comparison State
  comparisonResult: DistributionComparisonResult | null;
  isComparing: boolean;
  comparisonError: string | null;

  // Operational Reports State
  operationalMetrics: OperationalMetrics | null;
  driverMetrics: readonly DriverPerformanceMetrics[];
  isLoadingReports: boolean;
  reportsError: string | null;
  reportsFilter: ReportFilter;

  // Actions
  fetchHistory: (
    filterOverride?: Partial<DistributionHistoryFilter>,
    cursor?: string,
    direction?: 'next' | 'prev'
  ) => Promise<void>;
  setFilter: (filter: Partial<DistributionHistoryFilter>) => Promise<void>;
  resetFilter: () => Promise<void>;
  selectDistribution: (distributionId: string) => Promise<ApprovedDistribution | null>;
  selectDistributionByRevision: (revision: number) => Promise<ApprovedDistribution | null>;
  clearSelectedDistribution: () => void;
  compareRevisions: (baseRevision: number, targetRevision: number) => Promise<DistributionComparisonResult | null>;
  clearComparison: () => void;
  fetchReports: (filterOverride?: Partial<ReportFilter>) => Promise<void>;
  setReportsFilter: (filter: Partial<ReportFilter>) => Promise<void>;
  exportSelectedToExcel: () => Promise<{ filename: string; buffer: Uint8Array } | null>;
  exportSelectedToPdf: () => Promise<{ filename: string; htmlContent: string; print: () => void } | null>;
}

export const useDistributionHistoryStore = create<DistributionHistoryState>((set, get) => ({
  historyItems: Object.freeze([]),
  isLoadingHistory: false,
  historyError: null,
  activeFilter: {},
  pagination: {
    limit: 20,
    totalCount: 0,
    hasMore: false
  },

  selectedDistribution: null,
  isLoadingDetails: false,
  detailsError: null,

  comparisonResult: null,
  isComparing: false,
  comparisonError: null,

  operationalMetrics: null,
  driverMetrics: Object.freeze([]),
  isLoadingReports: false,
  reportsError: null,
  reportsFilter: {
    periodPreset: '30days'
  },

  fetchHistory: async (filterOverride, cursor, direction) => {
    set({ isLoadingHistory: true, historyError: null });
    const currentFilter = { ...get().activeFilter, ...filterOverride };
    const limit = get().pagination.limit;

    try {
      const result = await container.getDistributionHistoryUseCase.execute({
        filter: currentFilter,
        limit,
        cursor,
        direction
      });

      set({
        historyItems: result.items,
        isLoadingHistory: false,
        activeFilter: currentFilter,
        pagination: {
          limit,
          cursor,
          nextCursor: result.nextCursor,
          prevCursor: result.prevCursor,
          totalCount: result.totalCount,
          hasMore: result.hasMore
        }
      });
    } catch (err: any) {
      set({
        isLoadingHistory: false,
        historyError: err.message || 'فشل في تحميل سجل التوزيعات المعتمدة.'
      });
    }
  },

  setFilter: async (filterUpdate) => {
    const newFilter = { ...get().activeFilter, ...filterUpdate };
    // Remove empty values
    Object.keys(newFilter).forEach(k => {
      const key = k as keyof DistributionHistoryFilter;
      if (newFilter[key] === undefined || newFilter[key] === '') {
        delete (newFilter as any)[key];
      }
    });
    set({ activeFilter: newFilter });
    await get().fetchHistory(newFilter, undefined, undefined);
  },

  resetFilter: async () => {
    set({ activeFilter: {} });
    await get().fetchHistory({}, undefined, undefined);
  },

  selectDistribution: async (distributionId: string) => {
    set({ isLoadingDetails: true, detailsError: null });
    const user = useAuthStore.getState().user;

    try {
      const distribution = await container.getDistributionDetailsUseCase.execute({
        distributionId,
        requestingUserId: user?.uid,
        requestingUserEmail: user?.email
      });

      set({
        selectedDistribution: distribution,
        isLoadingDetails: false
      });
      return distribution;
    } catch (err: any) {
      set({
        isLoadingDetails: false,
        detailsError: err.message || 'فشل في جلب تفاصيل التوزيع المعتمد.'
      });
      return null;
    }
  },

  selectDistributionByRevision: async (revision: number) => {
    set({ isLoadingDetails: true, detailsError: null });
    const user = useAuthStore.getState().user;

    try {
      const distribution = await container.getDistributionDetailsUseCase.execute({
        revision,
        requestingUserId: user?.uid,
        requestingUserEmail: user?.email
      });

      set({
        selectedDistribution: distribution,
        isLoadingDetails: false
      });
      return distribution;
    } catch (err: any) {
      set({
        isLoadingDetails: false,
        detailsError: err.message || 'فشل في جلب تفاصيل المراجعة المعتمدة.'
      });
      return null;
    }
  },

  clearSelectedDistribution: () => {
    set({ selectedDistribution: null, detailsError: null });
  },

  compareRevisions: async (baseRevision: number, targetRevision: number) => {
    set({ isComparing: true, comparisonError: null });

    try {
      const result = await container.compareDistributionsUseCase.execute({
        baseIdentifier: { revision: baseRevision },
        targetIdentifier: { revision: targetRevision }
      });

      set({
        comparisonResult: result,
        isComparing: false
      });
      return result;
    } catch (err: any) {
      const msg = err.message || 'فشل في إجراء المقارنة بين المراجعتين.';
      set({
        isComparing: false,
        comparisonError: msg
      });
      return null;
    }
  },

  clearComparison: () => {
    set({ comparisonResult: null, comparisonError: null });
  },

  fetchReports: async (filterOverride) => {
    set({ isLoadingReports: true, reportsError: null });
    const currentFilter = { ...get().reportsFilter, ...filterOverride };

    // Calculate dates if preset provided
    let startDate = currentFilter.startDate;
    let endDate = currentFilter.endDate;

    if (currentFilter.periodPreset && currentFilter.periodPreset !== 'custom') {
      const now = new Date();
      endDate = now.toISOString().split('T')[0];

      if (currentFilter.periodPreset === 'today') {
        startDate = endDate;
      } else if (currentFilter.periodPreset === '7days') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split('T')[0];
      } else if (currentFilter.periodPreset === '30days') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString().split('T')[0];
      }
    }

    const resolvedFilter: ReportFilter = {
      ...currentFilter,
      startDate,
      endDate
    };

    try {
      const [operationalMetrics, driverMetrics] = await Promise.all([
        container.getOperationalReportsUseCase.execute(resolvedFilter),
        container.getDriverPerformanceUseCase.execute(resolvedFilter)
      ]);

      set({
        operationalMetrics,
        driverMetrics,
        isLoadingReports: false,
        reportsFilter: resolvedFilter
      });
    } catch (err: any) {
      set({
        isLoadingReports: false,
        reportsError: err.message || 'فشل في استخراج التقارير التشغيلية.'
      });
    }
  },

  setReportsFilter: async (filterUpdate) => {
    const newFilter = { ...get().reportsFilter, ...filterUpdate };
    set({ reportsFilter: newFilter });
    await get().fetchReports(newFilter);
  },

  exportSelectedToExcel: async () => {
    const dist = get().selectedDistribution;
    if (!dist) return null;

    const user = useAuthStore.getState().user;
    try {
      const result = await container.exportDistributionToExcelUseCase.execute({
        distribution: dist,
        userId: user?.uid,
        userEmail: user?.email
      });

      // Trigger automatic browser download
      const blob = new Blob([result.buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return result;
    } catch (err: any) {
      console.error('Excel export error:', err);
      throw err;
    }
  },

  exportSelectedToPdf: async () => {
    const dist = get().selectedDistribution;
    if (!dist) return null;

    const user = useAuthStore.getState().user;
    try {
      const result = await container.exportDistributionToPdfUseCase.execute({
        distribution: dist,
        userId: user?.uid,
        userEmail: user?.email
      });

      // Trigger print window
      result.print();
      return result;
    } catch (err: any) {
      console.error('PDF export error:', err);
      throw err;
    }
  }
}));
