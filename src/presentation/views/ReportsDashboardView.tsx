import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Truck,
  PackageCheck,
  Route as RouteIcon,
  Clock,
  Gauge,
  Percent,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  User,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { useDistributionHistoryStore } from '../../state/distributionHistoryStore';
import { useDriverStore } from '../../state/driverStore';
import { ReportPeriodPreset, DriverPerformanceMetrics } from '../../core/domain/entities/ReportingEntities';
import { Messages } from '../../localization/messages';

interface ReportsDashboardViewProps {
  messages: Messages;
  onNavigateToHistory: () => void;
}

export const ReportsDashboardView: React.FC<ReportsDashboardViewProps> = ({
  messages,
  onNavigateToHistory
}) => {
  const {
    operationalMetrics,
    driverMetrics,
    isLoadingReports,
    reportsError,
    reportsFilter,
    fetchReports,
    setReportsFilter
  } = useDistributionHistoryStore();

  const { drivers, fetchDrivers } = useDriverStore();

  const [selectedDriverId, setSelectedDriverId] = useState<string>(reportsFilter.driverId || '');
  const [selectedPreset, setSelectedPreset] = useState<ReportPeriodPreset>(
    reportsFilter.periodPreset || '30days'
  );
  const [startDateInput, setStartDateInput] = useState<string>(reportsFilter.startDate || '');
  const [endDateInput, setEndDateInput] = useState<string>(reportsFilter.endDate || '');

  useEffect(() => {
    fetchDrivers();
    fetchReports();
  }, [fetchDrivers, fetchReports]);

  const handlePeriodPreset = (preset: ReportPeriodPreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setReportsFilter({
        periodPreset: preset,
        startDate: undefined,
        endDate: undefined
      });
      setStartDateInput('');
      setEndDateInput('');
    }
  };

  const handleApplyCustomDates = () => {
    if (startDateInput || endDateInput) {
      setSelectedPreset('custom');
      setReportsFilter({
        periodPreset: 'custom',
        startDate: startDateInput || undefined,
        endDate: endDateInput || undefined
      });
    }
  };

  const handleDriverFilter = (driverId: string) => {
    setSelectedDriverId(driverId);
    setReportsFilter({ driverId: driverId || undefined });
  };

  const handleResetFilters = () => {
    setSelectedDriverId('');
    setSelectedPreset('30days');
    setStartDateInput('');
    setEndDateInput('');
    setReportsFilter({
      periodPreset: '30days',
      driverId: undefined,
      startDate: undefined,
      endDate: undefined
    });
  };

  const m = operationalMetrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">لوحة المؤشرات والتقارير التشغيلية</h1>
            <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              تحليلات الأداء والأسطول
            </span>
          </div>
          <p className="text-sm text-slate-500">
            تجميع إحصائي شامل لأداء التوزيع، مسافات الطرق المقطوعة، نسب إشغال المركبات، ومعدلات كفاءة السائقين.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReports()}
            disabled={isLoadingReports}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
            <span>تحديث المؤشرات</span>
          </button>
          <button
            onClick={onNavigateToHistory}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span>استعراض السجل الكامل</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>تحديد نطاق التحليل</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة ضبط الفلاتر</span>
          </button>
        </div>

        {/* Period Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 ml-2">الفترة الزمنية:</span>
          {(['today', '7days', '30days', 'custom'] as const).map(preset => {
            const labels: Record<string, string> = {
              today: 'اليوم',
              '7days': 'آخر 7 أيام',
              '30days': 'آخر 30 يوماً',
              custom: 'تاريخ مخصص'
            };
            const isActive = selectedPreset === preset;

            return (
              <button
                key={preset}
                onClick={() => handlePeriodPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Secondary filters: Driver & Custom Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {/* Driver Select */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              تصفية حسب سائق محدد
            </label>
            <select
              value={selectedDriverId}
              onChange={e => handleDriverFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">جميع السائقين (الأسطول بأكمله)</option>
              {drivers.map(d => (
                <option key={d.driverId} value={d.driverId}>
                  {d.driverName} ({d.driverId})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              تحديد تاريخ البداية والنهاية (عند اختيار مخصص)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDateInput}
                onChange={e => setStartDateInput(e.target.value)}
                className="w-1/2 text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">إلى</span>
              <input
                type="date"
                value={endDateInput}
                onChange={e => setEndDateInput(e.target.value)}
                className="w-1/2 text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleApplyCustomDates}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {reportsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{reportsError}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoadingReports && (
        <div className="p-12 text-center text-slate-500 space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm">جاري تجميع المؤشرات التشغيلية والبيانات الإحصائية...</p>
        </div>
      )}

      {/* Operational KPIs Grid */}
      {!isLoadingReports && m && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Distributions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">إجمالي التوزيعات المعتمدة</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <PackageCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{m.totalDistributions}</div>
              <div className="text-[11px] text-slate-400 mt-1">خطة توزيع معتمدة ومؤرشفة</div>
            </div>

            {/* Card 2: Total Weight */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">إجمالي الحمولات المشحونة</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {m.totalDeliveredWeightKg > 1000
                  ? `${(m.totalDeliveredWeightKg / 1000).toFixed(2)} طن`
                  : `${m.totalDeliveredWeightKg} كجم`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {m.totalDeliveredWeightKg} كجم صافي
              </div>
            </div>

            {/* Card 3: Total Distance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">إجمالي المسافة المقطوعة</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <RouteIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round((m.totalDistanceMeters / 1000) * 10) / 10} كم
              </div>
              <div className="text-[11px] text-slate-400 mt-1">على شبكة الطرق الحقيقية</div>
            </div>

            {/* Card 4: Total Driving Time */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">إجمالي ساعات القيادة</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round((m.totalDrivingTimeSeconds / 3600) * 10) / 10} س
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                ~{Math.round(m.totalDrivingTimeSeconds / 60)} دقيقة قيادة
              </div>
            </div>

            {/* Card 5: Average Distance Per Driver */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">متوسط المسافة لكل سائق</span>
                <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                  <RouteIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round((m.averageDistancePerDriverMeters / 1000) * 10) / 10} كم
              </div>
              <div className="text-[11px] text-slate-400 mt-1">لكل رحلة توزيع</div>
            </div>

            {/* Card 6: Average Fleet Load Utilization */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">متوسط نسبة إشغال المركبات</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {m.averageLoadUtilizationPercent}%
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, m.averageLoadUtilizationPercent)}%` }}
                ></div>
              </div>
            </div>

            {/* Card 7: Average Stops per Driver */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">متوسط المحطات لكل سائق</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {m.averageStopsPerDriver} محطة
              </div>
              <div className="text-[11px] text-slate-400 mt-1">توزيع متوازن للمحطات</div>
            </div>

            {/* Card 8: Unassigned Rate & Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">معدل عدم الإسناد والمؤشر</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-bold ${m.unassignedStopRatePercent > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {m.unassignedStopRatePercent}%
                </div>
                <div className="text-xs font-mono text-slate-500">
                  (مؤشر: {m.averageOptimizationScore})
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {m.unassignedStopRatePercent === 0 ? 'كفاءة تغطية 100%' : 'توجد محطات فائضة عن السعة'}
              </div>
            </div>
          </div>

          {/* Driver Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">سجل أداء السائقين التشغيلي</h2>
              </div>
              <span className="text-xs text-slate-500">
                {driverMetrics.length} سائقين نشطين في الفترة المحددة
              </span>
            </div>

            {driverMetrics.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                لا توجد بيانات رحلات مسجلة للسائقين في هذه الفترة الزمنية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">السائق</th>
                      <th className="py-3 px-4">التوزيعات</th>
                      <th className="py-3 px-4">المحطات المكتملة</th>
                      <th className="py-3 px-4">الحمولة الكلية</th>
                      <th className="py-3 px-4">المسافة الكلية</th>
                      <th className="py-3 px-4">زمن القيادة</th>
                      <th className="py-3 px-4">نسبة الإشغال</th>
                      <th className="py-3 px-4">متوسط محطات/رحلة</th>
                      <th className="py-3 px-4">متوسط مسافة/رحلة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {driverMetrics.map((dm: DriverPerformanceMetrics) => {
                      const distKm = Math.round((dm.totalDistanceMeters / 1000) * 10) / 10;
                      const durHrs = Math.round((dm.totalDrivingTimeSeconds / 3600) * 10) / 10;
                      const avgDistKm = Math.round((dm.averageDistancePerRouteMeters / 1000) * 10) / 10;

                      return (
                        <tr key={dm.driverId} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div>{dm.driverName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{dm.driverId}</div>
                          </td>
                          <td className="py-3 px-4 font-bold">{dm.distributionCount}</td>
                          <td className="py-3 px-4">{dm.totalStops} محطة</td>
                          <td className="py-3 px-4 font-semibold">{dm.totalWeightKg} كجم</td>
                          <td className="py-3 px-4">{distKm} كم</td>
                          <td className="py-3 px-4">{durHrs} ساعة</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full"
                                  style={{ width: `${Math.min(100, dm.averageUtilizationPercent)}%` }}
                                ></div>
                              </div>
                              <span className="font-semibold text-[11px]">{dm.averageUtilizationPercent}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{dm.averageStopsPerRoute}</td>
                          <td className="py-3 px-4">{avgDistKm} كم</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
