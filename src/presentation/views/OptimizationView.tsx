import React, { useState } from 'react';
import {
  Sparkles,
  Truck,
  Layers,
  Scale,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ArrowUpDown,
  MoveRight,
  FileSpreadsheet,
  Route as RouteIcon,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useOperationStore } from '../../state/operationStore';
import { useDriverStore } from '../../state/driverStore';
import { useSettingsStore } from '../../state/settingsStore';
import { CapacityDomainService } from '../../core/domain/services/CapacityDomainService';
import { Route } from '../../core/domain/entities/Route';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';

interface OptimizationViewProps {
  messages: Messages;
  onNavigateToImport: () => void;
  onNavigateToRouting: () => void;
}

export const OptimizationView: React.FC<OptimizationViewProps> = ({
  messages,
  onNavigateToImport,
  onNavigateToRouting
}) => {
  const {
    confirmedSession,
    deliveryStops,
    routeMatrix,
    distributionResult,
    optimizationStatus,
    optimizationErrorMessage,
    selectedDriverRouteId,
    runOptimization,
    reassignStop,
    selectDriverRoute
  } = useOperationStore();

  const { drivers } = useDriverStore();
  const { settings } = useSettingsStore();

  // Reassignment Modal State
  const [reassignModalStop, setReassignModalStop] = useState<DeliveryStop | null>(null);
  const [selectedTargetDriverId, setSelectedTargetDriverId] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);

  const activeDrivers = drivers.filter(d => d.active);
  const isOptimizing = optimizationStatus === 'OPTIMIZING';

  const hasConfirmedSession = Boolean(confirmedSession && deliveryStops.length > 0);
  const hasRouteMatrix = Boolean(routeMatrix);

  const handleRunOptimization = async () => {
    try {
      await runOptimization();
    } catch {
      // Error is tracked in store
    }
  };

  // Helper to format distance in km or meters
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Helper to format duration in minutes or hours
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const selectedRoute: Route | undefined = distributionResult?.routes.find(
    r => r.driverId === selectedDriverRouteId
  ) || distributionResult?.routes[0];

  const selectedDriver = drivers.find(d => d.driverId === selectedRoute?.driverId);

  const openReassignModal = (stop: DeliveryStop) => {
    setReassignModalStop(stop);
    setSelectedTargetDriverId(activeDrivers[0]?.driverId || '');
    setModalError(null);
  };

  const closeReassignModal = () => {
    setReassignModalStop(null);
    setSelectedTargetDriverId('');
    setModalError(null);
  };

  const handleExecuteReassignment = () => {
    if (!reassignModalStop || !selectedTargetDriverId) return;

    setIsReassigning(true);
    setModalError(null);

    try {
      reassignStop(reassignModalStop.stopId, selectedTargetDriverId);
      closeReassignModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setModalError(msg);
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {messages.optimization.title}
              </h2>
            </div>
            <p className="text-sm text-slate-500 max-w-3xl">
              {messages.optimization.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Scale className="h-3.5 w-3.5" />
              70% Distance / 30% Balance
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              110% Operational Ceiling
            </span>
          </div>
        </div>
      </div>

      {/* Missing Prerequisites States */}
      {!hasConfirmedSession ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              {messages.optimization.noConfirmedSession}
            </h3>
            <p className="text-xs text-slate-500">
              يرجى استيراد وتأكيد ملف شحنات Excel أولاً قبل تشغيل التحسين.
            </p>
          </div>
          <div>
            <button
              id="goto-import-btn-from-opt"
              onClick={onNavigateToImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition shadow-blue-600/30"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{messages.routing.importFirstButton}</span>
            </button>
          </div>
        </div>
      ) : activeDrivers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Truck className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              {messages.optimization.noActiveDrivers}
            </h3>
            <p className="text-xs text-slate-500">
              لا توجد مركبات أو سائقون في حالة نشطة في الأسطول.
            </p>
          </div>
        </div>
      ) : (
        /* Main Optimization Workspace */
        <div className="space-y-6">
          {/* Controls Bar & Global Score Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-blue-600" />
                    <span>السائقون النشطون</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {activeDrivers.length} <span className="text-xs font-normal text-slate-500">مركبة</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-600" />
                    <span>نقاط التوصيل (Stops)</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {deliveryStops.length} <span className="text-xs font-normal text-slate-500">نقطة</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-purple-600" />
                    <span>الحمولة الكلية</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {deliveryStops.reduce((sum, s) => sum + s.totalWeightKg, 0).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">كغم</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <RouteIcon className="h-3.5 w-3.5 text-amber-600" />
                    <span>حالة المصفوفة الطرقية</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {routeMatrix ? (
                      <span className="text-emerald-600 flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> جاهزة (Real Roads)
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" /> سيتم الحساب تلقائياً
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Run Optimization Button */}
              <div className="flex-shrink-0">
                <button
                  id="run-optimization-btn"
                  onClick={handleRunOptimization}
                  disabled={isOptimizing}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{messages.optimization.optimizing}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {distributionResult
                          ? messages.optimization.reoptimize
                          : messages.optimization.runOptimization}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {optimizationErrorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-900 animate-fadeIn">
                <AlertOctagon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">فشل عملية التحسين والتوزيع</div>
                  <div>{optimizationErrorMessage}</div>
                </div>
              </div>
            )}
          </div>

          {/* If Result is Available: Full Metrics Dashboard */}
          {distributionResult && (
            <div className="space-y-6">
              {/* Fleet-level Aggregate Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs font-semibold text-slate-500">
                    {messages.optimization.totalDistance}
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {formatDistance(distributionResult.totalDistanceMeters)}
                  </div>
                  <div className="text-[11px] text-slate-400">مجموع مسارات كافة السائقين</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs font-semibold text-slate-500">
                    {messages.optimization.totalDuration}
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {formatDuration(distributionResult.totalDurationSeconds)}
                  </div>
                  <div className="text-[11px] text-slate-400">زمن القيادة الإجمالي المقدر</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs font-semibold text-slate-500">
                    {messages.optimization.fleetUtilization}
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-600">
                    {CapacityDomainService.calculateFleetNominalCapacity(activeDrivers) > 0
                      ? ((distributionResult.totalWeightKg / CapacityDomainService.calculateFleetNominalCapacity(activeDrivers)) * 100).toFixed(1)
                      : '0'}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {distributionResult.totalWeightKg.toLocaleString()} كغم من أصل{' '}
                    {CapacityDomainService.calculateFleetNominalCapacity(activeDrivers).toLocaleString()} كغم
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
                  <div className="text-xs font-semibold text-slate-500">
                    {messages.optimization.balanceFairness}
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-600">
                    {distributionResult.metrics?.finalOptimizationScore !== undefined
                      ? (100 - Math.min(100, distributionResult.metrics.finalOptimizationScore * 100)).toFixed(1)
                      : '100.0'} / 100
                  </div>
                  <div className="text-[11px] text-slate-400">معيار العدالة والتوازن بين السائقين</div>
                </div>
              </div>

              {/* Unassigned Warning Notice if Any */}
              {distributionResult.unassignedStops.length > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-3 text-xs text-amber-900 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{messages.optimization.unassignedWarning}</div>
                      <div>
                        يوجد {distributionResult.unassignedStops.length} نقطة توصيل غير مسندة بوزن إجمالي{' '}
                        {distributionResult.unassignedStops.reduce((s, st) => s + st.totalWeightKg, 0)} كغم.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{messages.optimization.noUnassigned}</span>
                </div>
              )}

              {/* Route Assignment Breakdown: Driver Selector + Sequence Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Drivers Route Selector */}
                <div className="lg:col-span-1 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    {messages.optimization.assignedRoutes} ({distributionResult.routes.length})
                  </h3>

                  <div className="space-y-2.5">
                    {distributionResult.routes.map(route => {
                      const driver = drivers.find(d => d.driverId === route.driverId);
                      const isSelected = route.driverId === (selectedRoute?.driverId || '');
                      const nominal = driver?.maximumLoadKg || 1000;
                      const max110 = driver ? CapacityDomainService.getMaximumAllowedCapacity(driver) : nominal * 1.1;
                      const utilPercent = Math.round((route.totalWeightKg / nominal) * 100);
                      const isOversized110 = route.totalWeightKg > max110;

                      return (
                        <div
                          key={route.driverId}
                          onClick={() => selectDriverRoute(route.driverId)}
                          className={`p-4 rounded-2xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                                  isSelected
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <Truck className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  {driver?.driverName || route.driverId}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {route.driverId}
                                </div>
                              </div>
                            </div>

                            {/* Capacity Utilization Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOversized110
                                  ? 'bg-red-100 text-red-800'
                                  : utilPercent > 100
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {utilPercent}%
                            </span>
                          </div>

                          {/* Mini Stats Grid */}
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs pt-2.5 border-t border-slate-100">
                            <div>
                              <div className="text-[10px] text-slate-400">النقاط</div>
                              <div className="font-bold text-slate-800">{route.orderedStops.length}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">الحمولة</div>
                              <div className="font-bold font-mono text-slate-800">
                                {route.totalWeightKg} كغم
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400">المسافة</div>
                              <div className="font-bold font-mono text-slate-800">
                                {formatDistance(route.totalDistanceMeters)}
                              </div>
                            </div>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                isOversized110
                                  ? 'bg-red-500'
                                  : utilPercent > 100
                                  ? 'bg-amber-500'
                                  : 'bg-purple-600'
                              }`}
                              style={{ width: `${Math.min(utilPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Selected Route Delivery Sequence & Interventions */}
                <div className="lg:col-span-2 space-y-4">
                  {selectedRoute ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                      {/* Driver Summary Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                            <Truck className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-900">
                                {selectedDriver?.driverName || selectedRoute.driverId}
                              </h4>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                {selectedRoute.driverId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              الحمولة الاسمية:{' '}
                              <span className="font-semibold text-slate-700">
                                {selectedDriver?.maximumLoadKg} كغم
                              </span>{' '}
                              | الحد الأقصى 110%:{' '}
                              <span className="font-semibold text-slate-700">
                                {selectedDriver ? CapacityDomainService.getMaximumAllowedCapacity(selectedDriver) : 1100}{' '}
                                كغم
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right rtl:text-left">
                            <span className="text-slate-400 block text-[10px]">المسافة وزمن القيادة</span>
                            <span className="font-bold text-slate-800">
                              {formatDistance(selectedRoute.totalDistanceMeters)} /{' '}
                              {formatDuration(selectedRoute.totalDurationSeconds)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stops Sequence Table */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>{messages.optimization.routeSequence}</span>
                          <span>{selectedRoute.orderedStops.length} محطات توصيل</span>
                        </div>

                        {selectedRoute.orderedStops.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            {messages.optimization.routeEmpty}
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left rtl:text-right">
                              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-3 text-center w-12">#</th>
                                  <th className="p-3">نقطة التوصيل</th>
                                  <th className="p-3">اسم الزبون / المتجر</th>
                                  <th className="p-3 text-center">القوائم</th>
                                  <th className="p-3 text-center">الوزن</th>
                                  <th className="p-3 text-center">إعادة الإسناد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {selectedRoute.orderedStops.map((stop, sIdx) => (
                                  <tr key={stop.stopId} className="hover:bg-slate-50/80">
                                    <td className="p-3 text-center font-bold text-slate-400">
                                      {sIdx + 1}
                                    </td>
                                    <td className="p-3 font-mono font-bold text-slate-800">
                                      {stop.stopId}
                                    </td>
                                    <td className="p-3 font-medium text-slate-900">
                                      {stop.buyerName}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                        {stop.lists.length}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                                      {stop.totalWeightKg} كغم
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => openReassignModal(stop)}
                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1 mx-auto cursor-pointer"
                                      >
                                        <MoveRight className="h-3 w-3 rtl:rotate-180" />
                                        <span>نقل</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                      اختر سائقاً من القائمة لعرض تفاصيل المسار وتسلسل المحطات.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Reassignment Modal */}
      {reassignModalStop && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <MoveRight className="h-5 w-5 text-purple-600 rtl:rotate-180" />
                <span>{messages.optimization.reassignStop}</span>
              </div>
              <button
                onClick={closeReassignModal}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Stop Information Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">نقطة التوصيل:</span>
                <span className="font-mono font-bold text-slate-800">{reassignModalStop.stopId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الزبون:</span>
                <span className="font-semibold text-slate-800">{reassignModalStop.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">حمولة النقطة (غير قابلة للتجزئة):</span>
                <span className="font-mono font-bold text-purple-700">
                  {reassignModalStop.totalWeightKg} كغم
                </span>
              </div>
            </div>

            {/* Target Driver Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                {messages.optimization.targetDriver}
              </label>
              <select
                value={selectedTargetDriverId}
                onChange={e => setSelectedTargetDriverId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                {activeDrivers.map(d => {
                  const maxCap = CapacityDomainService.getMaximumAllowedCapacity(d);
                  return (
                    <option key={d.driverId} value={d.driverId}>
                      {d.driverName} ({d.driverId}) — سعة: {d.maximumLoadKg} كغم (حد 110%: {maxCap} كغم)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Modal Error Notice */}
            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                <AlertOctagon className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeReassignModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                {messages.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteReassignment}
                disabled={isReassigning}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isReassigning ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>تأكيد النقل وإعادة الحساب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
