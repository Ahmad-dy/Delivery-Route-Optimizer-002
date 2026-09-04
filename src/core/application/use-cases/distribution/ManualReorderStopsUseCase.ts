import { Route } from '../../../domain/entities/Route';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { Driver } from '../../../domain/entities/Driver';
import { Depot } from '../../../domain/entities/Depot';
import { OptimizationConfig } from '../../../domain/value-objects/OptimizationConfig';
import { OptimizationEvaluationService, ObjectiveScoreBreakdown } from '../../../domain/services/OptimizationEvaluationService';
import { DistributionInvariantValidator, InvariantValidationResult } from '../../../domain/services/DistributionValidator';
import { DistributionResult } from '../../../domain/entities/DistributionResult';
import { CalculateFinalRoutesUseCase } from './CalculateFinalRoutesUseCase';
import { IRoutingService } from '../../ports/IRoutingService';

export interface ManualReorderStopsRequest {
  readonly driverId: string;
  readonly newOrderedStopIds: readonly string[];
  readonly currentRoutes: readonly Route[];
  readonly unassignedStops: readonly DeliveryStop[];
  readonly activeDrivers: readonly Driver[];
  readonly depot: Depot;
  readonly config: OptimizationConfig;
  readonly referenceDistanceMeters: number;
}

export interface ManualReorderStopsResult {
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly routes: readonly Route[];
  readonly previousRouteDistanceMeters: number;
  readonly newRouteDistanceMeters: number;
  readonly distanceDifferenceMeters: number;
  readonly previousScore: ObjectiveScoreBreakdown;
  readonly newScore: ObjectiveScoreBreakdown;
  readonly isScoreDegraded: boolean;
  readonly scoreDegradationPercent: number;
  readonly validation: InvariantValidationResult;
}

export class ManualReorderStopsUseCase {
  constructor(
    private readonly routingService: IRoutingService,
    private readonly calculateFinalRoutesUseCase: CalculateFinalRoutesUseCase
  ) {}

  public async execute(request: ManualReorderStopsRequest): Promise<ManualReorderStopsResult> {
    const {
      driverId,
      newOrderedStopIds,
      currentRoutes,
      unassignedStops,
      activeDrivers,
      depot,
      config,
      referenceDistanceMeters
    } = request;

    const targetRoute = currentRoutes.find(r => r.driverId === driverId);
    if (!targetRoute) {
      return this.failResult(
        `لم يتم العثور على مسار للسائق (${driverId}).`,
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    // Verify all existing stops are accounted for
    const stopMap = new Map<string, DeliveryStop>();
    for (const s of targetRoute.orderedStops) {
      stopMap.set(s.stopId, s);
    }

    if (newOrderedStopIds.length !== targetRoute.orderedStops.length) {
      return this.failResult(
        'عدد المحطات في الترتيب الجديد لا يطابق عدد المحطات الحالية للمسار.',
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    const reorderedStops: DeliveryStop[] = [];
    for (const id of newOrderedStopIds) {
      const stop = stopMap.get(id);
      if (!stop) {
        return this.failResult(
          `المحطة (${id}) غير موجودة في مسار هذا السائق.`,
          currentRoutes,
          unassignedStops,
          activeDrivers,
          referenceDistanceMeters,
          config
        );
      }
      reorderedStops.push(stop);
    }

    // 1. Calculate previous metrics & score
    const previousRouteDistance = targetRoute.totalDistanceMeters;
    const previousScore = OptimizationEvaluationService.evaluateSolution({
      routes: currentRoutes,
      activeDrivers,
      referenceDistanceMeters,
      config
    });

    // 2. Prepare tentative route with new sequence
    const updatedRoutes: Route[] = currentRoutes.map(r => {
      if (r.driverId !== driverId) return r;
      return new Route({
        driverId: r.driverId,
        orderedStops: reorderedStops,
        totalWeightKg: r.totalWeightKg,
        utilizationPercent: r.utilizationPercent,
        totalDistanceMeters: r.totalDistanceMeters,
        totalDurationSeconds: r.totalDurationSeconds,
        polyline: r.polyline,
        isManuallyModified: true,
        routingStatus: r.routingStatus,
        legs: r.legs
      });
    });

    // 3. Recalculate ONLY affected driver route via Google Routing API
    const finalRoutesResult = await this.calculateFinalRoutesUseCase.execute({
      routes: updatedRoutes,
      depot,
      affectedDriverIds: [driverId]
    });

    // Check for routing failures - mutation MUST NOT succeed if routing fails
    if (finalRoutesResult.hasRoutingFailures) {
      const failedRoute = finalRoutesResult.routes.find(r => r.driverId === driverId);
      const detail = failedRoute?.routingErrorMessage || 'تعذر حساب مسار طرق صالح';
      return this.failResult(
        `فشل إعادة ترتيب محطات السائق (${driverId}): ${detail} [ROUTING_UNAVAILABLE]. تم إلغاء التعديل للحفاظ على سلامة التوزيع.`,
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    const newRoute = finalRoutesResult.routes.find(r => r.driverId === driverId);
    if (!newRoute || newRoute.routingStatus === 'ROUTING_UNAVAILABLE') {
      return this.failResult(
        `فشل إعادة ترتيب المسار: حالة المسار غير متاحة (ROUTING_UNAVAILABLE).`,
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    const newRouteDistance = newRoute.totalDistanceMeters;
    const distanceDiff = newRouteDistance - previousRouteDistance;

    // 4. Evaluate new composite score
    const newScore = OptimizationEvaluationService.evaluateSolution({
      routes: finalRoutesResult.routes,
      activeDrivers,
      referenceDistanceMeters,
      config
    });

    const isScoreDegraded = newScore.finalScore > previousScore.finalScore + 0.0001;
    const scoreDegradationPercent = isScoreDegraded
      ? ((newScore.finalScore - previousScore.finalScore) / Math.max(previousScore.finalScore, 0.001)) * 100
      : 0;

    // 5. Invariant validation
    const tempResult = new DistributionResult({
      routes: finalRoutesResult.routes,
      unassignedStops,
      oversizedStops: [],
      warnings: [],
      totalDistanceMeters: newScore.totalDistanceMeters,
      totalDurationSeconds: finalRoutesResult.routes.reduce((sum, r) => sum + r.totalDurationSeconds, 0),
      totalWeightKg: finalRoutesResult.routes.reduce((sum, r) => sum + r.totalWeightKg, 0),
      driversUsed: newScore.usedDriversCount
    });

    const validation = DistributionInvariantValidator.validate(tempResult, activeDrivers, depot);

    if (!validation.isValid) {
      const violations = validation.violations.map(v => v.message).join(' | ');
      return this.failResult(
        `التعديل يخالف قيود التوزيع الصارمة: ${violations}`,
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    return {
      success: true,
      routes: Object.freeze(finalRoutesResult.routes),
      previousRouteDistanceMeters: previousRouteDistance,
      newRouteDistanceMeters: newRouteDistance,
      distanceDifferenceMeters: distanceDiff,
      previousScore,
      newScore,
      isScoreDegraded,
      scoreDegradationPercent,
      validation
    };
  }

  private failResult(
    errorMessage: string,
    currentRoutes: readonly Route[],
    unassignedStops: readonly DeliveryStop[],
    activeDrivers: readonly Driver[],
    referenceDistanceMeters: number,
    config: OptimizationConfig
  ): ManualReorderStopsResult {
    const score = OptimizationEvaluationService.evaluateSolution({
      routes: currentRoutes,
      activeDrivers,
      referenceDistanceMeters,
      config
    });

    return {
      success: false,
      errorMessage,
      routes: currentRoutes,
      previousRouteDistanceMeters: 0,
      newRouteDistanceMeters: 0,
      distanceDifferenceMeters: 0,
      previousScore: score,
      newScore: score,
      isScoreDegraded: false,
      scoreDegradationPercent: 0,
      validation: { isValid: false, violations: [{ invariant: 'MANUAL_REORDER_FAILED', message: errorMessage }] }
    };
  }
}
