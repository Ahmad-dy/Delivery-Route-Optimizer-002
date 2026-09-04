import {
  ApproveDistributionPayload,
  DepotApprovalDTO,
  DriverApprovalDTO,
  DeliveryStopApprovalDTO,
  RouteApprovalDTO,
  MetricsApprovalDTO,
  WarningApprovalDTO
} from '../dtos/DistributionApprovalDTO';

export class DistributionApprovalValidationError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'invalid-argument') {
    super(message);
    this.name = 'DistributionApprovalValidationError';
    this.code = code;
  }
}

/**
 * Validates the complete distribution approval payload on the server.
 * Ensures zero-trust data integrity: types, value ranges, business invariants, and absence of failed routing.
 */
export function validateApproveDistributionPayload(raw: unknown): ApproveDistributionPayload {
  if (!raw || typeof raw !== 'object') {
    throw new DistributionApprovalValidationError('بيانات الاعتماد غير موجودة أو بصيغة غير صحيحة (Payload missing or not an object).');
  }

  const data = raw as Record<string, unknown>;

  // 1. Validate distributionId
  if (typeof data.distributionId !== 'string') {
    throw new DistributionApprovalValidationError('معرف التوزيع مطلوب ويجب أن يكون نصاً (distributionId must be string).');
  }
  const distributionId = data.distributionId.trim();
  if (distributionId.length === 0 || distributionId.length > 128) {
    throw new DistributionApprovalValidationError('معرف التوزيع غير صالح ويجب أن يكون بطول بين 1 و 128 محرفاً (Invalid distributionId length).');
  }
  if (!/^[a-zA-Z0-9_\-.:]+$/.test(distributionId)) {
    throw new DistributionApprovalValidationError('معرف التوزيع يحتوي على محارف غير مسموح بها (Invalid characters in distributionId).');
  }

  // 2. Validate createdAt
  if (typeof data.createdAt !== 'string' || isNaN(Date.parse(data.createdAt))) {
    throw new DistributionApprovalValidationError('تاريخ إنشاء الخطة غير صالح (createdAt must be valid ISO date string).');
  }

  // 3. Validate Depot
  if (!data.depot || typeof data.depot !== 'object') {
    throw new DistributionApprovalValidationError('بيانات المستودع مفقودة (depot object required).');
  }
  const rawDepot = data.depot as Record<string, unknown>;
  if (typeof rawDepot.latitude !== 'number' || isNaN(rawDepot.latitude) || rawDepot.latitude < -90 || rawDepot.latitude > 90) {
    throw new DistributionApprovalValidationError('خط عرض المستودع غير صالح ويجب أن يكون بين -90 و 90 (Invalid depot latitude).');
  }
  if (typeof rawDepot.longitude !== 'number' || isNaN(rawDepot.longitude) || rawDepot.longitude < -180 || rawDepot.longitude > 180) {
    throw new DistributionApprovalValidationError('خط طول المستودع غير صالح ويجب أن يكون بين -180 و 180 (Invalid depot longitude).');
  }
  const depot: DepotApprovalDTO = {
    latitude: rawDepot.latitude,
    longitude: rawDepot.longitude,
    name: typeof rawDepot.name === 'string' ? rawDepot.name.trim() : undefined
  };

  // 4. Validate Drivers
  if (!Array.isArray(data.drivers) || data.drivers.length === 0) {
    throw new DistributionApprovalValidationError('يجب تضمين سائق واحد على الأقل في خطة التوزيع (At least one driver required).');
  }

  const driverIds = new Set<string>();
  const drivers: DriverApprovalDTO[] = [];

  for (let i = 0; i < data.drivers.length; i++) {
    const d = data.drivers[i];
    if (!d || typeof d !== 'object') {
      throw new DistributionApprovalValidationError(`بيانات السائق في المؤشر [${i}] غير صالحة (Driver object invalid).`);
    }
    const dObj = d as Record<string, unknown>;
    if (typeof dObj.driverId !== 'string' || dObj.driverId.trim().length === 0) {
      throw new DistributionApprovalValidationError(`معرف السائق في المؤشر [${i}] مفقود أو فارغ (Driver ID missing).`);
    }
    const trimmedId = dObj.driverId.trim();
    if (driverIds.has(trimmedId)) {
      throw new DistributionApprovalValidationError(`معرف السائق (${trimmedId}) مكرر في قائمة السائقين (Duplicate driverId).`);
    }
    driverIds.add(trimmedId);

    if (typeof dObj.driverName !== 'string' || dObj.driverName.trim().length === 0) {
      throw new DistributionApprovalValidationError(`اسم السائق (${trimmedId}) مفقود (Driver name missing).`);
    }
    if (typeof dObj.maximumLoadKg !== 'number' || isNaN(dObj.maximumLoadKg) || dObj.maximumLoadKg <= 0) {
      throw new DistributionApprovalValidationError(`حمولة السائق (${trimmedId}) يجب أن تكون رقماً موجباً (Invalid driver maximumLoadKg).`);
    }
    if (typeof dObj.active !== 'boolean') {
      throw new DistributionApprovalValidationError(`حالة نشاط السائق (${trimmedId}) يجب أن تكون قيمة منطقية (Driver active must be boolean).`);
    }

    drivers.push({
      driverId: trimmedId,
      driverName: dObj.driverName.trim(),
      maximumLoadKg: Math.round(dObj.maximumLoadKg * 100) / 100,
      active: dObj.active
    });
  }

  // Helper to validate a delivery stop
  function validateStop(s: unknown, context: string): DeliveryStopApprovalDTO {
    if (!s || typeof s !== 'object') {
      throw new DistributionApprovalValidationError(`بيانات المحطة في سياق ${context} غير صالحة (Stop is not an object).`);
    }
    const sObj = s as Record<string, unknown>;
    if (typeof sObj.stopId !== 'string' || sObj.stopId.trim().length === 0) {
      throw new DistributionApprovalValidationError(`معرف المحطة مفقود في سياق ${context} (Stop ID missing).`);
    }
    if (typeof sObj.buyerCode !== 'string' || sObj.buyerCode.trim().length === 0) {
      throw new DistributionApprovalValidationError(`رمز المشتري مفقود للمحطة ${sObj.stopId} (buyerCode missing).`);
    }
    if (typeof sObj.buyerName !== 'string' || sObj.buyerName.trim().length === 0) {
      throw new DistributionApprovalValidationError(`اسم المشتري مفقود للمحطة ${sObj.stopId} (buyerName missing).`);
    }
    if (typeof sObj.latitude !== 'number' || isNaN(sObj.latitude) || sObj.latitude < -90 || sObj.latitude > 90) {
      throw new DistributionApprovalValidationError(`إحداثي العرض للمحطة ${sObj.stopId} غير صالح (Invalid latitude).`);
    }
    if (typeof sObj.longitude !== 'number' || isNaN(sObj.longitude) || sObj.longitude < -180 || sObj.longitude > 180) {
      throw new DistributionApprovalValidationError(`إحداثي الطول للمحطة ${sObj.stopId} غير صالح (Invalid longitude).`);
    }
    if (typeof sObj.totalWeightKg !== 'number' || isNaN(sObj.totalWeightKg) || sObj.totalWeightKg <= 0) {
      throw new DistributionApprovalValidationError(`وزن المحطة ${sObj.stopId} يجب أن يكون أكبر من الصفر (Invalid totalWeightKg).`);
    }
    if (!Array.isArray(sObj.lists) || sObj.lists.length === 0) {
      throw new DistributionApprovalValidationError(`المحطة ${sObj.stopId} يجب أن تحتوي على قائمة واحدة على الأقل (Lists array required).`);
    }

    const lists = sObj.lists.map((l, lIdx) => {
      if (!l || typeof l !== 'object') {
        throw new DistributionApprovalValidationError(`قائمة المحطة [${lIdx}] غير صالحة للمحطة ${sObj.stopId}.`);
      }
      const lObj = l as Record<string, unknown>;
      if (typeof lObj.listNumber !== 'string' || lObj.listNumber.trim().length === 0) {
        throw new DistributionApprovalValidationError(`رقم القائمة مفقود في المحطة ${sObj.stopId}.`);
      }
      if (typeof lObj.weightKg !== 'number' || isNaN(lObj.weightKg) || lObj.weightKg <= 0) {
        throw new DistributionApprovalValidationError(`وزن القائمة غير صالح في المحطة ${sObj.stopId}.`);
      }
      const buyerCode = (typeof lObj.buyerCode === 'string' && lObj.buyerCode.trim().length > 0)
        ? lObj.buyerCode.trim()
        : String(sObj.buyerCode || '').trim();
      const buyerName = (typeof lObj.buyerName === 'string' && lObj.buyerName.trim().length > 0)
        ? lObj.buyerName.trim()
        : String(sObj.buyerName || '').trim();

      return {
        listNumber: lObj.listNumber.trim(),
        buyerCode,
        buyerName,
        weightKg: Math.round(lObj.weightKg * 100) / 100
      };
    });

    return {
      stopId: sObj.stopId.trim(),
      buyerCode: sObj.buyerCode.trim(),
      buyerName: sObj.buyerName.trim(),
      latitude: sObj.latitude,
      longitude: sObj.longitude,
      lists,
      totalWeightKg: Math.round(sObj.totalWeightKg * 100) / 100
    };
  }

  // 5. Validate Stops (Global List)
  if (!Array.isArray(data.stops)) {
    throw new DistributionApprovalValidationError('قائمة المحطات الإجمالية يجب أن تكون مصفوفة (stops must be array).');
  }
  const stops = data.stops.map((s, idx) => validateStop(s, `stops[${idx}]`));

  // 6. Validate Unassigned Stops
  if (!Array.isArray(data.unassigned)) {
    throw new DistributionApprovalValidationError('قائمة المحطات غير المسندة يجب أن تكون مصفوفة (unassigned must be array).');
  }
  const unassigned = data.unassigned.map((u, idx) => validateStop(u, `unassigned[${idx}]`));

  // 7. Validate Routes
  if (!Array.isArray(data.routes)) {
    throw new DistributionApprovalValidationError('قائمة المسارات يجب أن تكون مصفوفة (routes must be array).');
  }

  const seenStopIds = new Set<string>();
  const routes: RouteApprovalDTO[] = [];

  for (let rIdx = 0; rIdx < data.routes.length; rIdx++) {
    const r = data.routes[rIdx];
    if (!r || typeof r !== 'object') {
      throw new DistributionApprovalValidationError(`المسار في المؤشر [${rIdx}] غير صالح (Route is not an object).`);
    }
    const rObj = r as Record<string, unknown>;
    if (typeof rObj.driverId !== 'string' || !driverIds.has(rObj.driverId.trim())) {
      throw new DistributionApprovalValidationError(`المسار [${rIdx}] يشير إلى سائق غير موجود (${rObj.driverId}).`);
    }

    // Invariant: Do not approve distribution if any route failed routing!
    if (rObj.routingStatus === 'ROUTING_UNAVAILABLE') {
      throw new DistributionApprovalValidationError(
        `لا يمكن اعتماد خطة التوزيع لأن المسار للسائق (${rObj.driverId}) به خطأ في حساب التوجيه (ROUTING_UNAVAILABLE).`
      );
    }

    if (typeof rObj.totalDistanceMeters !== 'number' || isNaN(rObj.totalDistanceMeters) || rObj.totalDistanceMeters < 0) {
      throw new DistributionApprovalValidationError(`المسافة الإجمالية للمسار [${rIdx}] غير صالحة (Invalid totalDistanceMeters).`);
    }
    if (typeof rObj.totalDurationSeconds !== 'number' || isNaN(rObj.totalDurationSeconds) || rObj.totalDurationSeconds < 0) {
      throw new DistributionApprovalValidationError(`الزمن الإجمالي للمسار [${rIdx}] غير صالح (Invalid totalDurationSeconds).`);
    }
    if (typeof rObj.totalWeightKg !== 'number' || isNaN(rObj.totalWeightKg) || rObj.totalWeightKg < 0) {
      throw new DistributionApprovalValidationError(`الوزن الإجمالي للمسار [${rIdx}] غير صالح (Invalid totalWeightKg).`);
    }
    if (typeof rObj.utilizationPercent !== 'number' || isNaN(rObj.utilizationPercent) || rObj.utilizationPercent < 0) {
      throw new DistributionApprovalValidationError(`نسبة إشغال المسار [${rIdx}] غير صالحة (Invalid utilizationPercent).`);
    }

    if (!Array.isArray(rObj.orderedStops)) {
      throw new DistributionApprovalValidationError(`محطات المسار [${rIdx}] يجب أن تكون مصفوفة (orderedStops must be array).`);
    }

    const orderedStops = rObj.orderedStops.map((st, stIdx) => {
      const validatedStop = validateStop(st, `routes[${rIdx}].orderedStops[${stIdx}]`);
      if (seenStopIds.has(validatedStop.stopId)) {
        throw new DistributionApprovalValidationError(
          `المحطة (${validatedStop.stopId}) مكررة عبر المسارات المختلفة (Duplicate stopId across routes).`
        );
      }
      seenStopIds.add(validatedStop.stopId);
      return validatedStop;
    });

    routes.push({
      driverId: rObj.driverId.trim(),
      orderedStops,
      totalWeightKg: Math.round(rObj.totalWeightKg * 100) / 100,
      utilizationPercent: Math.round(rObj.utilizationPercent * 100) / 100,
      totalDistanceMeters: Math.round(rObj.totalDistanceMeters),
      totalDurationSeconds: Math.round(rObj.totalDurationSeconds),
      polyline: typeof rObj.polyline === 'string' ? rObj.polyline : undefined,
      isManuallyModified: Boolean(rObj.isManuallyModified),
      routingStatus: rObj.routingStatus === 'CALCULATING' ? 'CALCULATING' : 'OK',
      routingErrorMessage: typeof rObj.routingErrorMessage === 'string' ? rObj.routingErrorMessage : undefined,
      legs: Array.isArray(rObj.legs) ? rObj.legs.map((leg: any) => ({
        originId: String(leg.originId || ''),
        destinationId: String(leg.destinationId || ''),
        distanceMeters: Number(leg.distanceMeters || 0),
        durationSeconds: Number(leg.durationSeconds || 0)
      })) : undefined
    });
  }

  // Invariant: Unassigned stops must not intersect with assigned stops
  for (const u of unassigned) {
    if (seenStopIds.has(u.stopId)) {
      throw new DistributionApprovalValidationError(
        `المحطة (${u.stopId}) موجودة كمسندة وغير مسندة في نفس الوقت (Stop is both assigned and unassigned).`
      );
    }
  }

  // 8. Validate Metrics
  if (!data.metrics || typeof data.metrics !== 'object') {
    throw new DistributionApprovalValidationError('مقاييس التحسين مفقودة (metrics object required).');
  }
  const mObj = data.metrics as Record<string, unknown>;
  if (typeof mObj.finalDistanceMeters !== 'number' || isNaN(mObj.finalDistanceMeters) || mObj.finalDistanceMeters < 0) {
    throw new DistributionApprovalValidationError('المسافة النهائية في المقاييس غير صالحة (Invalid finalDistanceMeters).');
  }
  if (typeof mObj.totalDurationSeconds !== 'number' || isNaN(mObj.totalDurationSeconds) || mObj.totalDurationSeconds < 0) {
    throw new DistributionApprovalValidationError('الزمن الإجمالي في المقاييس غير صالح (Invalid totalDurationSeconds in metrics).');
  }
  if (typeof mObj.finalOptimizationScore !== 'number' || isNaN(mObj.finalOptimizationScore) || mObj.finalOptimizationScore < 0 || mObj.finalOptimizationScore > 1) {
    throw new DistributionApprovalValidationError('درجة التحسين في المقاييس يجب أن تكون بين 0 و 1 (finalOptimizationScore out of range).');
  }

  const metrics: MetricsApprovalDTO = {
    initialDistanceMeters: Number(mObj.initialDistanceMeters || 0),
    finalDistanceMeters: Number(mObj.finalDistanceMeters),
    initialLoadVariance: Number(mObj.initialLoadVariance || 0),
    finalLoadVariance: Number(mObj.finalLoadVariance || 0),
    finalOptimizationScore: Number(mObj.finalOptimizationScore),
    totalDurationSeconds: Number(mObj.totalDurationSeconds),
    iterationCount: Math.max(0, Math.round(Number(mObj.iterationCount || 0))),
    executionDurationMs: Number(mObj.executionDurationMs || 0),
    activeDriversUsed: Math.max(0, Math.round(Number(mObj.activeDriversUsed || 0)))
  };

  // 9. Validate optimizationScore
  if (typeof data.optimizationScore !== 'number' || isNaN(data.optimizationScore) || data.optimizationScore < 0 || data.optimizationScore > 1) {
    throw new DistributionApprovalValidationError('درجة التحسين الإجمالية يجب أن تكون بين 0 و 1 (optimizationScore out of range [0, 1]).');
  }

  // 10. Validate Warnings
  if (!Array.isArray(data.warnings)) {
    throw new DistributionApprovalValidationError('قائمة التحذيرات يجب أن تكون مصفوفة (warnings must be array).');
  }
  const warnings: WarningApprovalDTO[] = data.warnings.map((w, wIdx) => {
    if (!w || typeof w !== 'object') {
      throw new DistributionApprovalValidationError(`التحذير في المؤشر [${wIdx}] غير صالح.`);
    }
    const wObj = w as Record<string, unknown>;
    return {
      code: String(wObj.code || 'UNKNOWN'),
      message: String(wObj.message || ''),
      messageKey: String(wObj.messageKey || wObj.code || 'UNKNOWN'),
      params: (wObj.params && typeof wObj.params === 'object') ? (wObj.params as Record<string, string | number>) : undefined
    };
  });

  return {
    distributionId,
    createdAt: data.createdAt,
    depot,
    drivers,
    routes,
    stops,
    unassigned,
    metrics,
    optimizationScore: data.optimizationScore,
    warnings
  };
}
