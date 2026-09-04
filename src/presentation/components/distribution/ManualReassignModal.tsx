import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  Truck,
  AlertOctagon,
  AlertTriangle,
  Scale,
  TrendingDown,
  TrendingUp,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { DeliveryStop } from '../../../core/domain/entities/DeliveryStop';
import { Route } from '../../../core/domain/entities/Route';
import { Driver } from '../../../core/domain/entities/Driver';
import { Messages } from '../../../localization/messages';
import { CapacityDomainService } from '../../../core/domain/services/CapacityDomainService';

interface ManualReassignModalProps {
  stop: DeliveryStop;
  currentRoute?: Route;
  allRoutes: readonly Route[];
  activeDrivers: readonly Driver[];
  messages: Messages;
  onConfirm: (targetDriverId: string | null) => Promise<void>;
  onClose: () => void;
}

export const ManualReassignModal: React.FC<ManualReassignModalProps> = ({
  stop,
  currentRoute,
  allRoutes,
  activeDrivers,
  messages,
  onConfirm,
  onClose
}) => {
  const d = messages.distribution;

  // Selected target driver ID: either a driverId string, or 'UNASSIGNED'
  const [targetId, setTargetId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Find candidate target options
  const targetDriver = activeDrivers.find(d => d.driverId === targetId);
  const targetRoute = allRoutes.find(r => r.driverId === targetId);

  // Capacity simulation for target driver
  const simulation = useMemo(() => {
    if (!targetId || targetId === 'UNASSIGNED') {
      return null;
    }
    if (!targetDriver) return null;

    const nominal = targetDriver.maximumLoadKg;
    const operationalLimit = CapacityDomainService.calculateOperationalLimit(nominal);
    const currentWeight = targetRoute ? targetRoute.totalWeightKg : 0;
    const newWeight = Math.round((currentWeight + stop.totalWeightKg) * 100) / 100;
    const isExceeded = newWeight > operationalLimit;
    const isInBuffer = newWeight > nominal && !isExceeded;
    const newUtilization = Math.round((newWeight / nominal) * 100);

    return {
      nominal,
      operationalLimit,
      currentWeight,
      newWeight,
      isExceeded,
      isInBuffer,
      newUtilization
    };
  }, [targetId, targetDriver, targetRoute, stop.totalWeightKg]);

  const handleConfirm = async () => {
    if (!targetId) return;
    if (simulation && simulation.isExceeded) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const actualTargetDriverId = targetId === 'UNASSIGNED' ? null : targetId;
      await onConfirm(actualTargetDriverId);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || messages.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{d.moveStopModalTitle}</h3>
              <p className="text-xs text-slate-500">نقل نقطة التوصيل وفحص شروط السعة وإعادة التوجيه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Stop Details Card */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl">
            <div className="text-xs text-blue-900 font-semibold mb-1">تفاصيل المحطة المحددة:</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm">{stop.buyerName}</span>
                <span className="text-xs font-mono text-slate-500 mr-2">({stop.buyerCode})</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {stop.totalWeightKg.toLocaleString()} {messages.common.kg}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              تحتوي على {stop.lists.length} قائمة شحن تابعة لنفس المشتري.
            </div>
            {currentRoute && (
              <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-blue-100 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-slate-500" />
                <span>السائق الحالي: <strong>{currentRoute.driverId}</strong></span>
              </div>
            )}
          </div>

          {/* Select Target Driver */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {d.targetDriver} <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">{d.selectTargetDriver}</option>
              {activeDrivers
                .filter(drv => drv.driverId !== currentRoute?.driverId)
                .map(drv => (
                  <option key={drv.driverId} value={drv.driverId}>
                    {drv.driverName} ({drv.driverId}) - السعة: {drv.maximumLoadKg} كغم
                  </option>
                ))}
              <option value="UNASSIGNED">-- {d.unassignedTarget} --</option>
            </select>
          </div>

          {/* Target Driver Simulation Preview */}
          {simulation && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                simulation.isExceeded
                  ? 'bg-rose-50 border-rose-300'
                  : simulation.isInBuffer
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {simulation.isExceeded ? (
                  <AlertOctagon className="h-4 w-4 text-rose-600" />
                ) : simulation.isInBuffer ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                <span
                  className={`text-xs font-bold ${
                    simulation.isExceeded
                      ? 'text-rose-900'
                      : simulation.isInBuffer
                      ? 'text-amber-900'
                      : 'text-emerald-900'
                  }`}
                >
                  {simulation.isExceeded
                    ? 'فحص السعة: لا يمكن نقل هذا العميل (مرفوض)'
                    : simulation.isInBuffer
                    ? 'فحص السعة: تحذير (هامش 110%)'
                    : 'فحص السعة: التعديل متاح ومسموح'}
                </span>
              </div>

              {simulation.isExceeded ? (
                <div className="text-xs text-rose-800 space-y-1 font-medium">
                  <p>لا يمكن نقل هذا العميل إلى هذا السائق.</p>
                  <p>
                    الوزن بعد النقل = <strong>{simulation.newWeight.toLocaleString()} كغم</strong>
                  </p>
                  <p>
                    الحد التشغيلي الأقصى للسائق (110%) = <strong>{simulation.operationalLimit.toLocaleString()} كغم</strong>
                  </p>
                  <p className="text-[11px] text-rose-600 pt-1">
                    (تجاوز بمقدار {(simulation.newWeight - simulation.operationalLimit).toFixed(1)} كغم).
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span>الحمولة الحالية:</span>
                    <span className="font-mono">{simulation.currentWeight} كغم</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>الحمولة بعد النقل:</span>
                    <span className="font-mono">{simulation.newWeight} كغم ({simulation.newUtilization}%)</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>الحد الأقصى المسموح (110%):</span>
                    <span className="font-mono">{simulation.operationalLimit} كغم</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {targetId === 'UNASSIGNED' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              سيتم سحب المحطة من السائق الحالي ووضعها في قائمة المحطات غير الموزعة (Unassigned).
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            id="confirm-reassign-btn"
            onClick={handleConfirm}
            disabled={!targetId || (simulation?.isExceeded ?? false) || isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'جاري النقل...' : d.moveStopConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
