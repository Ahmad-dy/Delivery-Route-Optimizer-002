import { Route } from '../../../domain/entities/Route';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { Driver } from '../../../domain/entities/Driver';
import { Depot } from '../../../domain/entities/Depot';
import { OptimizationConfig } from '../../../domain/value-objects/OptimizationConfig';
import { CapacityDomainService } from '../../../domain/services/CapacityDomainService';
import { RouteSequenceOptimizer } from '../../../domain/services/RouteSequenceOptimizer';
import { OptimizationEvaluationService, ObjectiveScoreBreakdown } from '../../../domain/services/OptimizationEvaluationService';
import { DistributionInvariantValidator, InvariantValidationResult } from '../../../domain/services/DistributionValidator';
import { DistributionResult } from '../../../domain/entities/DistributionResult';
import { CalculateFinalRoutesUseCase } from './CalculateFinalRoutesUseCase';
import { IRoutingService } from '../../ports/IRoutingService';

export interface ManualReassignStopRequest {
  readonly stopId: string;
  readonly sourceDriverId?: string; // If undefined or 'UNASSIGNED', coming from unassigned
  readonly targetDriverId: string | 'UNASSIGNED';
  readonly currentRoutes: readonly Route[];
  readonly unassignedStops: readonly DeliveryStop[];
  readonly activeDrivers: readonly Driver[];
  readonly depot: Depot;
  readonly config: OptimizationConfig;
  readonly referenceDistanceMeters: number;
}

export interface ManualReassignStopResult {
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly routes: readonly Route[];
  readonly unassignedStops: readonly DeliveryStop[];
  readonly previousScore: ObjectiveScoreBreakdown;
  readonly newScore: ObjectiveScoreBreakdown;
  readonly isScoreDegraded: boolean;
  readonly scoreDegradationPercent: number;
  readonly validation: InvariantValidationResult;
  readonly affectedDriverIds: readonly string[];
}

export class ManualReassignStopUseCase {
  constructor(
    private readonly routingService: IRoutingService,
    private readonly calculateFinalRoutesUseCase: CalculateFinalRoutesUseCase
  ) {}

  public async execute(request: ManualReassignStopRequest): Promise<ManualReassignStopResult> {
    const {
      stopId,
      sourceDriverId,
      targetDriverId,
      currentRoutes,
      unassignedStops,
      activeDrivers,
      depot,
      config,
      referenceDistanceMeters
    } = request;

    const driverMap = new Map<string, Driver>();
    for (const d of activeDrivers) {
      if (d.active) {
        driverMap.set(d.driverId, d);
      }
    }

    // 1. Locate the Stop to move
    let stopToMove: DeliveryStop | undefined;
    let effectiveSourceDriverId = sourceDriverId;

    if (!effectiveSourceDriverId || effectiveSourceDriverId === 'UNASSIGNED') {
      stopToMove = unassignedStops.find(s => s.stopId === stopId);
      effectiveSourceDriverId = 'UNASSIGNED';
    } else {
      const sourceRoute = currentRoutes.find(r => r.driverId === effectiveSourceDriverId);
      stopToMove = sourceRoute?.orderedStops.find(s => s.stopId === stopId);
    }

    // Fallback: search all routes if not found
    if (!stopToMove) {
      for (const r of currentRoutes) {
        const found = r.orderedStops.find(s => s.stopId === stopId);
        if (found) {
          stopToMove = found;
          effectiveSourceDriverId = r.driverId;
          break;
        }
      }
      if (!stopToMove) {
        stopToMove = unassignedStops.find(s => s.stopId === stopId);
        if (stopToMove) {
          effectiveSourceDriverId = 'UNASSIGNED';
        }
      }
    }

    if (!stopToMove) {
      return this.failResult(
        `تعذر العثور على العميل المراد نقله (ID: ${stopId}).`,
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    if (effectiveSourceDriverId === targetDriverId) {
      return this.failResult(
        'العميل مسند بالفعل إلى نفس السائق.',
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    // 2. Validate Target Driver & Capacity Constraint
    if (targetDriverId !== 'UNASSIGNED') {
      const targetDriver = driverMap.get(targetDriverId);
      if (!targetDriver) {
        return this.failResult(
          `السائق الهدف (${targetDriverId}) غير موجود أو غير نشط.`,
          currentRoutes,
          unassignedStops,
          activeDrivers,
          referenceDistanceMeters,
          config
        );
      }

      const targetRoute = currentRoutes.find(r => r.driverId === targetDriverId);
      const currentTargetWeight = targetRoute?.totalWeightKg ?? 0;
      const newTargetWeight = Math.round((currentTargetWeight + stopToMove.totalWeightKg) * 100) / 100;
      const nominalCapacity = targetDriver.maximumLoadKg;
      const operationalLimit = CapacityDomainService.calculateOperationalLimit(nominalCapacity);

      if (newTargetWeight > operationalLimit) {
        return this.failResult(
          `لا يمكن نقل هذا العميل.\nالوزن بعد النقل = ${newTargetWeight.toLocaleString()} كغم\nالحد التشغيلي للسائق (${targetDriver.driverName}) = ${operationalLimit.toLocaleString()} كغم`,
          currentRoutes,
          unassignedStops,
          activeDrivers,
          referenceDistanceMeters,
          config
        );
      }
    }

    // 3. Compute baseline previous score before mutation
    const previousScore = OptimizationEvaluationService.evaluateSolution({
      routes: currentRoutes,
      activeDrivers,
      referenceDistanceMeters,
      config
    });

    // 4. Perform atomic move: Remove stop from source, add stop to target
    const newRoutes: Route[] = [];
    let newUnassignedStops: DeliveryStop[] = [...unassignedStops];
    const affectedDriverIds: string[] = [];

    // Process source
    if (effectiveSourceDriverId === 'UNASSIGNED') {
      newUnassignedStops = newUnassignedStops.filter(s => s.stopId !== stopId);
    } else {
      affectedDriverIds.push(effectiveSourceDriverId);
    }

    // Process target
    if (targetDriverId === 'UNASSIGNED') {
      newUnassignedStops.push(stopToMove);
    } else {
      affectedDriverIds.push(targetDriverId);
    }

    for (const r of currentRoutes) {
      if (r.driverId === effectiveSourceDriverId) {
        const remainingStops = r.orderedStops.filter(s => s.stopId !== stopId);
        const newWeight = remainingStops.reduce((sum, s) => sum + s.totalWeightKg, 0);
        const driver = driverMap.get(r.driverId);
        const nominal = driver?.maximumLoadKg ?? 1000;
        newRoutes.push(
          new Route({
            driverId: r.driverId,
            orderedStops: remainingStops,
            totalWeightKg: newWeight,
            utilizationPercent: (newWeight / nominal) * 100,
            totalDistanceMeters: r.totalDistanceMeters,
            totalDurationSeconds: r.totalDurationSeconds,
            polyline: r.polyline,
            isManuallyModified: true,
            routingStatus: r.routingStatus,
            legs: r.legs
          })
        );
      } else if (r.driverId === targetDriverId) {
        const appendedStops = [...r.orderedStops, stopToMove];
        const newWeight = appendedStops.reduce((sum, s) => sum + s.totalWeightKg, 0);
        const driver = driverMap.get(r.driverId);
        const nominal = driver?.maximumLoadKg ?? 1000;
        newRoutes.push(
          new Route({
            driverId: r.driverId,
            orderedStops: appendedStops,
            totalWeightKg: newWeight,
            utilizationPercent: (newWeight / nominal) * 100,
            totalDistanceMeters: r.totalDistanceMeters,
            totalDurationSeconds: r.totalDurationSeconds,
            polyline: r.polyline,
            isManuallyModified: true,
            routingStatus: r.routingStatus,
            legs: r.legs
          })
        );
      } else {
        newRoutes.push(r);
      }
    }

    // If target driver had no route yet, add route for target driver
    if (targetDriverId !== 'UNASSIGNED' && !newRoutes.some(r => r.driverId === targetDriverId)) {
      const driver = driverMap.get(targetDriverId);
      const nominal = driver?.maximumLoadKg ?? 1000;
      newRoutes.push(
        new Route({
          driverId: targetDriverId,
          orderedStops: [stopToMove],
          totalWeightKg: stopToMove.totalWeightKg,
          utilizationPercent: (stopToMove.totalWeightKg / nominal) * 100,
          totalDistanceMeters: 0,
          totalDurationSeconds: 0,
          isManuallyModified: true,
          routingStatus: 'OK',
          legs: []
        })
      );
    }

    // 5. Recalculate ONLY affected routes via Google Routing Service
    const finalRoutesResult = await this.calculateFinalRoutesUseCase.execute({
      routes: newRoutes,
      depot,
      affectedDriverIds
    });

    // Check for routing failures - mutation MUST NOT succeed if routing fails
    if (finalRoutesResult.hasRoutingFailures) {
      const failedDrivers = finalRoutesResult.failedDriverIds.join(', ');
      const failedRoute = finalRoutesResult.routes.find(r => finalRoutesResult.failedDriverIds.includes(r.driverId));
      const reason = failedRoute?.routingErrorMessage || 'تعذر حساب مسار طرق صالح';
      return this.failResult(
        `فشل نقل المحطة: تعذر حساب مسار صالح على شبكة الطرق للسائق (${failedDrivers}) (${reason}) [ROUTING_UNAVAILABLE]. تم إلغاء النقل للحفاظ على سلامة التوزيع.`,
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    const hasBrokenAffectedRoute = finalRoutesResult.routes.some(
      r => affectedDriverIds.includes(r.driverId) && r.routingStatus === 'ROUTING_UNAVAILABLE'
    );
    if (hasBrokenAffectedRoute) {
      return this.failResult(
        'فشل حساب المسار على شبكة الطرق لأحد السائقين المتأثرين (ROUTING_UNAVAILABLE). تم إلغاء النقل.',
        currentRoutes,
        unassignedStops,
        activeDrivers,
        referenceDistanceMeters,
        config
      );
    }

    // 6. Evaluate new composite score
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

    // 7. Validate full invariants after mutation
    const tempResult = new DistributionResult({
      routes: finalRoutesResult.routes,
      unassignedStops: newUnassignedStops,
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
      unassignedStops: Object.freeze(newUnassignedStops),
      previousScore,
      newScore,
      isScoreDegraded,
      scoreDegradationPercent,
      validation,
      affectedDriverIds: Object.freeze(affectedDriverIds)
    };
  }

  private failResult(
    errorMessage: string,
    currentRoutes: readonly Route[],
    unassignedStops: readonly DeliveryStop[],
    activeDrivers: readonly Driver[],
    referenceDistanceMeters: number,
    config: OptimizationConfig
  ): ManualReassignStopResult {
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
      unassignedStops,
      previousScore: score,
      newScore: score,
      isScoreDegraded: false,
      scoreDegradationPercent: 0,
      validation: { isValid: false, violations: [{ invariant: 'MANUAL_REASSIGN_FAILED', message: errorMessage }] },
      affectedDriverIds: []
    };
  }
}
