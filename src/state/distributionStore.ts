import { create } from 'zustand';
import { Route } from '../core/domain/entities/Route';
import { DeliveryStop } from '../core/domain/entities/DeliveryStop';
import { Driver } from '../core/domain/entities/Driver';
import { Depot } from '../core/domain/entities/Depot';
import { DistributionResult } from '../core/domain/entities/DistributionResult';
import { ApprovedDistribution } from '../core/domain/entities/ApprovedDistribution';
import { OptimizationConfig } from '../core/domain/value-objects/OptimizationConfig';
import { DistributionWarningService, DomainDistributionWarning } from '../core/domain/services/distribution/DistributionWarningService';
import { DistributionInvariantValidator, InvariantValidationResult } from '../core/domain/services/DistributionValidator';
import { OptimizationEvaluationService, ObjectiveScoreBreakdown } from '../core/domain/services/OptimizationEvaluationService';
import { container } from '../core/application/di/container';

export interface DistributionStateSnapshot {
  readonly routes: readonly Route[];
  readonly unassignedStops: readonly DeliveryStop[];
  readonly referenceDistanceMeters: number;
  readonly description: string;
}

export interface MutationNotice {
  readonly title: string;
  readonly message: string;
  readonly diffText?: string;
  readonly isDegraded: boolean;
  readonly degradationPercent?: number;
}

export type DistributionWorkflowStatus =
  | 'idle'
  | 'calculating_routes'
  | 'mutating'
  | 'approving'
  | 'approved'
  | 'error';

export interface DistributionState {
  routes: readonly Route[];
  unassignedStops: readonly DeliveryStop[];
  oversizedStops: readonly DeliveryStop[];
  activeDrivers: readonly Driver[];
  depot: Depot | null;
  referenceDistanceMeters: number;
  config: OptimizationConfig;
  status: DistributionWorkflowStatus;
  progress: { completed: number; total: number; message: string } | null;
  errorMessage: string | null;
  lastMutationNotice: MutationNotice | null;
  warnings: readonly DomainDistributionWarning[];
  validation: InvariantValidationResult | null;
  scoreBreakdown: ObjectiveScoreBreakdown | null;
  approvedDistribution: ApprovedDistribution | null;
  approvedHistory: readonly ApprovedDistribution[];
  historyStack: readonly DistributionStateSnapshot[];
  runId: number;

  // Actions
  initializeFromOptimizationResult: (params: {
    result: DistributionResult;
    activeDrivers: readonly Driver[];
    depot: Depot;
    referenceDistanceMeters: number;
    config: OptimizationConfig;
  }) => Promise<void>;

  calculateFinalRoutes: () => Promise<void>;

  manualReassignStop: (stopId: string, targetDriverId: string | 'UNASSIGNED') => Promise<boolean>;

  manualReorderStops: (driverId: string, newOrderedStopIds: readonly string[]) => Promise<boolean>;

  undo: () => void;

  approveDistribution: (approvedBy?: string) => Promise<boolean>;

  loadApprovedHistory: () => Promise<void>;

  clearError: () => void;

  clearMutationNotice: () => void;

  reset: () => void;
}

export const useDistributionStore = create<DistributionState>((set, get) => ({
  routes: [],
  unassignedStops: [],
  oversizedStops: [],
  activeDrivers: [],
  depot: null,
  referenceDistanceMeters: 0,
  config: OptimizationConfig.default(),
  status: 'idle',
  progress: null,
  errorMessage: null,
  lastMutationNotice: null,
  warnings: [],
  validation: null,
  scoreBreakdown: null,
  approvedDistribution: null,
  approvedHistory: [],
  historyStack: [],
  runId: 0,

  initializeFromOptimizationResult: async ({
    result,
    activeDrivers,
    depot,
    referenceDistanceMeters,
    config
  }) => {
    const currentRunId = get().runId + 1;
    set({
      runId: currentRunId,
      routes: result.routes,
      unassignedStops: result.unassignedStops,
      oversizedStops: result.oversizedStops,
      activeDrivers,
      depot,
      referenceDistanceMeters: referenceDistanceMeters > 0 ? referenceDistanceMeters : result.totalDistanceMeters,
      config,
      status: 'calculating_routes',
      errorMessage: null,
      lastMutationNotice: null,
      historyStack: []
    });

    // Evaluate initial score
    const scoreBreakdown = OptimizationEvaluationService.evaluateSolution({
      routes: result.routes,
      activeDrivers,
      referenceDistanceMeters: referenceDistanceMeters > 0 ? referenceDistanceMeters : result.totalDistanceMeters,
      config
    });

    const validation = DistributionInvariantValidator.validate(result, activeDrivers, depot);
    const warnings = DistributionWarningService.evaluateWarnings({
      routes: result.routes,
      activeDrivers,
      unassignedStops: result.unassignedStops,
      oversizedStops: result.oversizedStops
    });

    set({
      scoreBreakdown,
      validation,
      warnings
    });

    // Trigger calculation of actual Google Routes for routes needing polylines or final road distance
    try {
      const calcResult = await container.calculateFinalRoutesUseCase.execute({
        routes: result.routes,
        depot,
        onProgress: (completed, total, driverId) => {
          if (get().runId === currentRunId) {
            set({
              progress: {
                completed,
                total,
                message: `حساب المسار الفعلي (${completed} / ${total}) للسائق: ${driverId}`
              }
            });
          }
        }
      });

      if (get().runId !== currentRunId) return;

      const updatedScore = OptimizationEvaluationService.evaluateSolution({
        routes: calcResult.routes,
        activeDrivers,
        referenceDistanceMeters: get().referenceDistanceMeters,
        config
      });

      const updatedResult = new DistributionResult({
        routes: calcResult.routes,
        unassignedStops: result.unassignedStops,
        oversizedStops: result.oversizedStops,
        warnings: [],
        totalDistanceMeters: updatedScore.totalDistanceMeters,
        totalDurationSeconds: calcResult.routes.reduce((s, r) => s + r.totalDurationSeconds, 0),
        totalWeightKg: calcResult.routes.reduce((s, r) => s + r.totalWeightKg, 0),
        driversUsed: updatedScore.usedDriversCount
      });

      const updatedValidation = DistributionInvariantValidator.validate(updatedResult, activeDrivers, depot);
      const updatedWarnings = DistributionWarningService.evaluateWarnings({
        routes: calcResult.routes,
        activeDrivers,
        unassignedStops: result.unassignedStops,
        oversizedStops: result.oversizedStops
      });

      set({
        routes: calcResult.routes,
        scoreBreakdown: updatedScore,
        validation: updatedValidation,
        warnings: updatedWarnings,
        status: 'idle',
        progress: null
      });
    } catch (err: unknown) {
      if (get().runId !== currentRunId) return;
      const errorMsg = err instanceof Error ? err.message : 'خطأ في حساب المسارات الفعلية';
      set({
        status: 'idle',
        progress: null,
        errorMessage: errorMsg
      });
    }
  },

  calculateFinalRoutes: async () => {
    const { routes, depot, activeDrivers, config, referenceDistanceMeters, unassignedStops, oversizedStops } = get();
    if (!depot || routes.length === 0) return;

    const currentRunId = get().runId + 1;
    set({
      runId: currentRunId,
      status: 'calculating_routes',
      errorMessage: null,
      progress: { completed: 0, total: routes.length, message: 'بدء حساب المسارات...' }
    });

    try {
      const calcResult = await container.calculateFinalRoutesUseCase.execute({
        routes,
        depot,
        onProgress: (completed, total, driverId) => {
          if (get().runId === currentRunId) {
            set({
              progress: {
                completed,
                total,
                message: `حساب المسار الفعلي (${completed} / ${total}) للسائق: ${driverId}`
              }
            });
          }
        }
      });

      if (get().runId !== currentRunId) return;

      const scoreBreakdown = OptimizationEvaluationService.evaluateSolution({
        routes: calcResult.routes,
        activeDrivers,
        referenceDistanceMeters,
        config
      });

      const tempResult = new DistributionResult({
        routes: calcResult.routes,
        unassignedStops,
        oversizedStops,
        warnings: [],
        totalDistanceMeters: scoreBreakdown.totalDistanceMeters,
        totalDurationSeconds: calcResult.routes.reduce((s, r) => s + r.totalDurationSeconds, 0),
        totalWeightKg: calcResult.routes.reduce((s, r) => s + r.totalWeightKg, 0),
        driversUsed: scoreBreakdown.usedDriversCount
      });

      const validation = DistributionInvariantValidator.validate(tempResult, activeDrivers, depot);
      const warnings = DistributionWarningService.evaluateWarnings({
        routes: calcResult.routes,
        activeDrivers,
        unassignedStops,
        oversizedStops
      });

      set({
        routes: calcResult.routes,
        scoreBreakdown,
        validation,
        warnings,
        status: 'idle',
        progress: null
      });
    } catch (err: unknown) {
      if (get().runId !== currentRunId) return;
      const errorMsg = err instanceof Error ? err.message : 'فشل حساب المسارات النهائية';
      set({
        status: 'idle',
        progress: null,
        errorMessage: errorMsg
      });
    }
  },

  manualReassignStop: async (stopId: string, targetDriverId: string | 'UNASSIGNED') => {
    const {
      routes,
      unassignedStops,
      activeDrivers,
      depot,
      config,
      referenceDistanceMeters,
      historyStack,
      oversizedStops
    } = get();

    if (!depot) {
      set({ errorMessage: 'موقع المستودع غير محدد.' });
      return false;
    }

    set({ status: 'mutating', errorMessage: null, lastMutationNotice: null });

    // Snapshot current state for UNDO
    const snapshot: DistributionStateSnapshot = {
      routes: [...routes],
      unassignedStops: [...unassignedStops],
      referenceDistanceMeters,
      description: `نقل المحطة (${stopId}) إلى السائق (${targetDriverId})`
    };

    try {
      const result = await container.manualReassignStopUseCase.execute({
        stopId,
        targetDriverId,
        currentRoutes: routes,
        unassignedStops,
        activeDrivers,
        depot,
        config,
        referenceDistanceMeters
      });

      if (!result.success) {
        set({
          status: 'idle',
          errorMessage: result.errorMessage ?? 'فشل نقل العميل.'
        });
        return false;
      }

      // Re-evaluate warnings
      const warnings = DistributionWarningService.evaluateWarnings({
        routes: result.routes,
        activeDrivers,
        unassignedStops: result.unassignedStops,
        oversizedStops,
        isManualScoreDegraded: result.isScoreDegraded,
        scoreDegradationPercent: result.scoreDegradationPercent
      });

      const notice: MutationNotice = {
        title: 'تم نقل المحطة بنجاح',
        message: result.isScoreDegraded
          ? `تم تحديث المسار ولكن زادت تكلفة التوزيع (+${result.scoreDegradationPercent.toFixed(1)}%).`
          : 'تم تحديث المسارات وإعادة حساب المسافات بدقة.',
        diffText: `نقاط التحسين: ${result.previousScore.finalScore.toFixed(3)} ← ${result.newScore.finalScore.toFixed(3)}`,
        isDegraded: result.isScoreDegraded,
        degradationPercent: result.scoreDegradationPercent
      };

      set({
        routes: result.routes,
        unassignedStops: result.unassignedStops,
        scoreBreakdown: result.newScore,
        validation: result.validation,
        warnings,
        lastMutationNotice: notice,
        historyStack: [snapshot, ...historyStack].slice(0, 20),
        status: 'idle'
      });

      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع أثناء نقل المحطة';
      set({ status: 'idle', errorMessage: errorMsg });
      return false;
    }
  },

  manualReorderStops: async (driverId: string, newOrderedStopIds: readonly string[]) => {
    const {
      routes,
      unassignedStops,
      activeDrivers,
      depot,
      config,
      referenceDistanceMeters,
      historyStack,
      oversizedStops
    } = get();

    if (!depot) {
      set({ errorMessage: 'موقع المستودع غير محدد.' });
      return false;
    }

    set({ status: 'mutating', errorMessage: null, lastMutationNotice: null });

    // Snapshot current state for UNDO
    const snapshot: DistributionStateSnapshot = {
      routes: [...routes],
      unassignedStops: [...unassignedStops],
      referenceDistanceMeters,
      description: `إعادة ترتيب محطات السائق (${driverId})`
    };

    try {
      const result = await container.manualReorderStopsUseCase.execute({
        driverId,
        newOrderedStopIds,
        currentRoutes: routes,
        unassignedStops,
        activeDrivers,
        depot,
        config,
        referenceDistanceMeters
      });

      if (!result.success) {
        set({
          status: 'idle',
          errorMessage: result.errorMessage ?? 'فشل إعادة الترتيب.'
        });
        return false;
      }

      // Re-evaluate warnings
      const warnings = DistributionWarningService.evaluateWarnings({
        routes: result.routes,
        activeDrivers,
        unassignedStops,
        oversizedStops,
        isManualScoreDegraded: result.isScoreDegraded,
        scoreDegradationPercent: result.scoreDegradationPercent
      });

      const prevKm = (result.previousRouteDistanceMeters / 1000).toFixed(1);
      const newKm = (result.newRouteDistanceMeters / 1000).toFixed(1);
      const diffKm = (result.distanceDifferenceMeters / 1000).toFixed(1);
      const diffSign = result.distanceDifferenceMeters >= 0 ? `+${diffKm}` : diffKm;

      const notice: MutationNotice = {
        title: 'تم تعديل تسلسل المسار',
        message: result.isScoreDegraded
          ? 'هذا التعديل اليدوي زاد من المسافة الطرقية الكلية.'
          : 'تم تحسين المسافة الطرقية بعد إعادة التسلسل.',
        diffText: `المسافة السابقة: ${prevKm} كم | المسافة الجديدة: ${newKm} كم (${diffSign} كم)`,
        isDegraded: result.isScoreDegraded,
        degradationPercent: result.scoreDegradationPercent
      };

      set({
        routes: result.routes,
        scoreBreakdown: result.newScore,
        validation: result.validation,
        warnings,
        lastMutationNotice: notice,
        historyStack: [snapshot, ...historyStack].slice(0, 20),
        status: 'idle'
      });

      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع أثناء إعادة الترتيب';
      set({ status: 'idle', errorMessage: errorMsg });
      return false;
    }
  },

  undo: () => {
    const { historyStack, activeDrivers, depot, referenceDistanceMeters, config, oversizedStops } = get();
    if (historyStack.length === 0 || !depot) return;

    const [previousSnapshot, ...remainingHistory] = historyStack;

    const scoreBreakdown = OptimizationEvaluationService.evaluateSolution({
      routes: previousSnapshot.routes,
      activeDrivers,
      referenceDistanceMeters,
      config
    });

    const tempResult = new DistributionResult({
      routes: previousSnapshot.routes,
      unassignedStops: previousSnapshot.unassignedStops,
      oversizedStops,
      warnings: [],
      totalDistanceMeters: scoreBreakdown.totalDistanceMeters,
      totalDurationSeconds: previousSnapshot.routes.reduce((s, r) => s + r.totalDurationSeconds, 0),
      totalWeightKg: previousSnapshot.routes.reduce((s, r) => s + r.totalWeightKg, 0),
      driversUsed: scoreBreakdown.usedDriversCount
    });

    const validation = DistributionInvariantValidator.validate(tempResult, activeDrivers, depot);
    const warnings = DistributionWarningService.evaluateWarnings({
      routes: previousSnapshot.routes,
      activeDrivers,
      unassignedStops: previousSnapshot.unassignedStops,
      oversizedStops
    });

    set({
      routes: previousSnapshot.routes,
      unassignedStops: previousSnapshot.unassignedStops,
      historyStack: remainingHistory,
      scoreBreakdown,
      validation,
      warnings,
      lastMutationNotice: {
        title: 'تم التراجع عن التعديل',
        message: `تمت استعادة الحالة السابقة: ${previousSnapshot.description}`,
        isDegraded: false
      }
    });
  },

  approveDistribution: async (approvedBy?: string) => {
    const {
      routes,
      unassignedStops,
      oversizedStops,
      activeDrivers,
      depot,
      config,
      referenceDistanceMeters,
      approvedDistribution
    } = get();

    if (!depot) {
      set({ errorMessage: 'موقع المستودع غير محدد.' });
      return false;
    }

    set({ status: 'approving', errorMessage: null });

    try {
      const result = await container.approveDistributionUseCase.execute({
        routes,
        unassignedStops,
        oversizedStops,
        activeDrivers,
        depot,
        config,
        referenceDistanceMeters,
        approvedBy
      });

      if (!result.success || !result.approvedDistribution) {
        set({
          status: 'idle',
          errorMessage: result.errorMessage ?? 'تعذر اعتماد التوزيع بسبب وجود مخالفات تشغيلية.'
        });
        return false;
      }

      set({
        status: 'approved',
        approvedDistribution: result.approvedDistribution,
        validation: result.validation,
        warnings: result.warnings,
        lastMutationNotice: {
          title: 'تم اعتماد التوزيع النهائي وحفظه بنجاح',
          message: `المعرف: ${result.approvedDistribution.distributionId} (نسخة رقم ${result.approvedDistribution.revision})`,
          isDegraded: false
        }
      });

      // Reload history
      await get().loadApprovedHistory();
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'فشل حفظ وتوثيق التوزيع المعتمد';
      set({ status: 'idle', errorMessage: errorMsg });
      return false;
    }
  },

  loadApprovedHistory: async () => {
    try {
      const history = await container.distributionRepo.listApprovedDistributions();
      set({ approvedHistory: history });
    } catch (err) {
      console.warn('Failed to load approved distribution history', err);
    }
  },

  clearError: () => set({ errorMessage: null }),

  clearMutationNotice: () => set({ lastMutationNotice: null }),

  reset: () =>
    set({
      routes: [],
      unassignedStops: [],
      oversizedStops: [],
      activeDrivers: [],
      depot: null,
      referenceDistanceMeters: 0,
      status: 'idle',
      progress: null,
      errorMessage: null,
      lastMutationNotice: null,
      warnings: [],
      validation: null,
      scoreBreakdown: null,
      approvedDistribution: null,
      historyStack: []
    })
}));
