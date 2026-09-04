import { Route } from '../../entities/Route';
import { DeliveryStop } from '../../entities/DeliveryStop';
import { Driver } from '../../entities/Driver';
import { CapacityDomainService } from '../CapacityDomainService';

export type WarningSeverity = 'info' | 'warning' | 'error';

export interface DomainDistributionWarning {
  readonly code: string;
  readonly severity: WarningSeverity;
  readonly message: string;
  readonly relatedDriverId?: string;
  readonly relatedStopId?: string;
}

export class DistributionWarningService {
  /**
   * Evaluates all domain-level warnings across the active routes, drivers, and unassigned stops.
   */
  public static evaluateWarnings(params: {
    routes: readonly Route[];
    activeDrivers: readonly Driver[];
    unassignedStops: readonly DeliveryStop[];
    oversizedStops?: readonly DeliveryStop[];
    isManualScoreDegraded?: boolean;
    scoreDegradationPercent?: number;
  }): readonly DomainDistributionWarning[] {
    const warnings: DomainDistributionWarning[] = [];
    const driverMap = new Map<string, Driver>();
    for (const d of params.activeDrivers) {
      driverMap.set(d.driverId, d);
    }

    // 1. Capacity & Driver Invariants
    for (const route of params.routes) {
      if (route.orderedStops.length === 0) continue;

      const driver = driverMap.get(route.driverId);
      if (!driver) {
        warnings.push({
          code: 'DATA_INTEGRITY_MISSING_DRIVER',
          severity: 'error',
          message: `المسار مرتبط بسائق غير مسجل (${route.driverId}).`,
          relatedDriverId: route.driverId
        });
        continue;
      }

      if (!driver.active) {
        warnings.push({
          code: 'DATA_INTEGRITY_INACTIVE_DRIVER',
          severity: 'error',
          message: `السائق (${driver.driverName}) غير نشط ولا يمكن إسناد مسار له.`,
          relatedDriverId: driver.driverId
        });
      }

      // Check Capacity violations
      const nominal = driver.maximumLoadKg;
      const operational = CapacityDomainService.calculateOperationalLimit(nominal);

      if (route.totalWeightKg > operational) {
        warnings.push({
          code: 'CAPACITY_EXCEEDED_ERROR',
          severity: 'error',
          message: `تجاوز السائق (${driver.driverName}) الحد الأقصى التشغيلي (110%): ${route.totalWeightKg} كغم / ${operational} كغم.`,
          relatedDriverId: driver.driverId
        });
      } else if (route.totalWeightKg > nominal) {
        warnings.push({
          code: 'CAPACITY_BUFFER_WARNING',
          severity: 'warning',
          message: `السائق (${driver.driverName}) يعمل ضمن هامش الـ 10% الإضافي: ${route.totalWeightKg} كغم / ${nominal} كغم اسمي.`,
          relatedDriverId: driver.driverId
        });
      } else if (route.totalWeightKg < nominal * 0.40 && route.orderedStops.length > 0) {
        warnings.push({
          code: 'CAPACITY_UNDERUTILIZED_INFO',
          severity: 'info',
          message: `نسبة إشغال شاحنة السائق (${driver.driverName}) منخفضة (${Math.round(route.utilizationPercent)}%).`,
          relatedDriverId: driver.driverId
        });
      }

      // 2. Routing Status Integrity
      if (route.routingStatus === 'ROUTING_UNAVAILABLE') {
        warnings.push({
          code: 'ROUTING_UNAVAILABLE_ERROR',
          severity: 'error',
          message: `تعذر حساب المسار الطرقي الفعلي للسائق (${driver.driverName}). ${route.routingErrorMessage ?? ''}`,
          relatedDriverId: driver.driverId
        });
      } else if (!route.polyline && route.orderedStops.length > 0) {
        warnings.push({
          code: 'ROUTING_MISSING_POLYLINE_WARNING',
          severity: 'warning',
          message: `المسار الطرقي للسائق (${driver.driverName}) لا يحتوي على رسم بياني للمسار (Polyline).`,
          relatedDriverId: driver.driverId
        });
      }
    }

    // 3. Unassigned Stops Warnings
    for (const stop of params.unassignedStops) {
      const isOversized = params.oversizedStops?.some(o => o.stopId === stop.stopId);
      if (isOversized) {
        warnings.push({
          code: 'UNASSIGNED_OVERSIZED_ERROR',
          severity: 'error',
          message: `العميل (${stop.buyerName} - ${stop.stopId}) وزنه (${stop.totalWeightKg} كغم) يتجاوز السعة القصوى لجميع السائقين المتاحين.`,
          relatedStopId: stop.stopId
        });
      } else {
        warnings.push({
          code: 'UNASSIGNED_PENDING_WARNING',
          severity: 'warning',
          message: `العميل (${stop.buyerName}) غير مسند إلى أي مسار ويحتاج مراجعة أو تخصيص سائق إضافي.`,
          relatedStopId: stop.stopId
        });
      }
    }

    // 4. Manual Optimization Warnings
    if (params.isManualScoreDegraded) {
      const pct = params.scoreDegradationPercent ? ` بنسبة (+${params.scoreDegradationPercent.toFixed(1)}%)` : '';
      warnings.push({
        code: 'MANUAL_SCORE_DEGRADED_WARNING',
        severity: 'warning',
        message: `التعديل اليدوي الأخير أدى إلى زيادة التكلفة الطرقية أو تقليل توازن الأحمال${pct}.`
      });
    }

    return Object.freeze(warnings);
  }
}
