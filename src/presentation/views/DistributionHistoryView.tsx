import React, { useEffect, useState } from 'react';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Eye,
  FileSpreadsheet,
  FileText,
  GitCompare,
  ChevronRight,
  ChevronLeft,
  Truck,
  MapPin,
  Clock,
  Gauge,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useDistributionHistoryStore } from '../../state/distributionHistoryStore';
import { useDriverStore } from '../../state/driverStore';
import { ApprovedDistribution } from '../../core/domain/entities/ApprovedDistribution';
import { HistoryDatePreset } from '../../core/domain/entities/ReportingEntities';
import { DistributionComparisonModal } from '../components/distribution/DistributionComparisonModal';

interface DistributionHistoryViewProps {
  onSelectDistribution: (distributionId: string) => void;
}

export const DistributionHistoryView: React.FC<DistributionHistoryViewProps> = ({
  onSelectDistribution
}) => {
  const {
    historyItems,
    isLoadingHistory,
    historyError,
    activeFilter,
    pagination,
    fetchHistory,
    setFilter,
    resetFilter
  } = useDistributionHistoryStore();

  const { drivers, fetchDrivers } = useDriverStore();

  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(activeFilter.driverId || '');
  const [revisionInput, setRevisionInput] = useState<string>(activeFilter.revision ? String(activeFilter.revision) : '');
  const [searchIdInput, setSearchIdInput] = useState<string>(activeFilter.distributionId || '');
  const [startDateInput, setStartDateInput] = useState<string>(activeFilter.startDate || '');
  const [endDateInput, setEndDateInput] = useState<string>(activeFilter.endDate || '');

  useEffect(() => {
    fetchHistory();
    fetchDrivers();
  }, [fetchHistory, fetchDrivers]);

  const handleDatePreset = (preset: HistoryDatePreset | 'all') => {
    if (preset === 'all') {
      setFilter({ datePreset: undefined, startDate: undefined, endDate: undefined });
      setStartDateInput('');
      setEndDateInput('');
    } else {
      setFilter({ datePreset: preset, startDate: undefined, endDate: undefined });
      setStartDateInput('');
      setEndDateInput('');
    }
  };

  const handleApplyCustomDates = () => {
    if (startDateInput || endDateInput) {
      setFilter({
        datePreset: 'custom',
        startDate: startDateInput || undefined,
        endDate: endDateInput || undefined
      });
    }
  };

  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    setFilter({ driverId: driverId || undefined });
  };

  const handleRevisionSearch = () => {
    const revNum = revisionInput ? parseInt(revisionInput, 10) : undefined;
    setFilter({ revision: revNum && !isNaN(revNum) ? revNum : undefined });
  };

  const handleIdSearch = () => {
    setFilter({ distributionId: searchIdInput.trim() || undefined });
  };

  const handleResetAll = () => {
    setSelectedDriverId('');
    setRevisionInput('');
    setSearchIdInput('');
    setStartDateInput('');
    setEndDateInput('');
    resetFilter();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">سجل التوزيعات المعتمدة</h1>
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              لقطات غير قابلة للتعديل (Immutable Snapshots)
            </span>
          </div>
          <p className="text-sm text-slate-500">
            أرشيف العمليات المعتمدة رسمياً، استعراض المسارات التاريخية، المقارنة بين المراجعات، وتصدير التقارير (Excel / PDF).
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="compare-distributions-btn"
            onClick={() => setIsCompareModalOpen(true)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            <span>مقارنة مراجعتين</span>
          </button>
          <button
            id="refresh-history-btn"
            onClick={() => fetchHistory()}
            disabled={isLoadingHistory}
            className="inline-flex items-center justify-center p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="تحديث السجل"
          >
            <RotateCcw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>تصفية وتخصيص السجل</span>
          </div>
          <button
            onClick={handleResetAll}
            className="text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة تعيين الفلاتر</span>
          </button>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 ml-2">الفترة الزمنية:</span>
          {(['all', 'today', 'yesterday', 'this_week', 'this_month'] as const).map(preset => {
            const labels: Record<string, string> = {
              all: 'الكل',
              today: 'اليوم',
              yesterday: 'أمس',
              this_week: 'آخر 7 أيام',
              this_month: 'آخر 30 يوم'
            };
            const isActive = preset === 'all'
              ? !activeFilter.datePreset && !activeFilter.startDate
              : activeFilter.datePreset === preset;

            return (
              <button
                key={preset}
                onClick={() => handleDatePreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Driver Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">السائق</label>
            <select
              value={selectedDriverId}
              onChange={e => handleDriverChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">جميع السائقين</option>
              {drivers.map(d => (
                <option key={d.driverId} value={d.driverId}>
                  {d.driverName} ({d.driverId})
                </option>
              ))}
            </select>
          </div>

          {/* Revision Search */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">رقم المراجعة (Revision)</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                placeholder="مثال: 16"
                value={revisionInput}
                onChange={e => setRevisionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRevisionSearch()}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleRevisionSearch}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                بحث
              </button>
            </div>
          </div>

          {/* Distribution ID Search */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">معرف التوزيع (ID)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="بحث بالمعرف..."
                value={searchIdInput}
                onChange={e => setSearchIdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIdSearch()}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleIdSearch}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">نطاق تاريخ مخصص</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDateInput}
                onChange={e => setStartDateInput(e.target.value)}
                className="w-1/2 text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">إلى</span>
              <input
                type="date"
                value={endDateInput}
                onChange={e => setEndDateInput(e.target.value)}
                className="w-1/2 text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleApplyCustomDates}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                title="تطبيق التاريخ"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {historyError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{historyError}</span>
        </div>
      )}

      {/* Distribution Snapshots Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoadingHistory ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-sm">جاري تحميل سجل التوزيعات المعتمدة...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <HistoryIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">لا توجد توزيعات معتمدة بعد</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              عند اعتماد خطة توزيع من واجهة "إدارة وتوزيع المسارات"، ستظهر هنا كلقطة تاريخية معتمدة ومؤرشفة برقم مراجعة فريد.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3.5 px-4">المراجعة</th>
                  <th className="py-3.5 px-4">معرف التوزيع</th>
                  <th className="py-3.5 px-4">تاريخ ووقت الاعتماد</th>
                  <th className="py-3.5 px-4">السائقون</th>
                  <th className="py-3.5 px-4">المحطات</th>
                  <th className="py-3.5 px-4">الوزن المحمّل</th>
                  <th className="py-3.5 px-4">المسافة الكلية</th>
                  <th className="py-3.5 px-4">زمن القيادة</th>
                  <th className="py-3.5 px-4">غير المسند</th>
                  <th className="py-3.5 px-4">مؤشر التحسين</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {historyItems.map((item: ApprovedDistribution) => {
                  const distKm = Math.round((item.metrics.finalDistanceMeters / 1000) * 10) / 10;
                  const durMin = Math.round((item.metrics.totalDurationSeconds / 60) * 10) / 10;
                  const totalWeight = Math.round(
                    item.routes.reduce((sum, r) => sum + r.totalWeightKg, 0) * 10
                  ) / 10;
                  const dateStr = new Date(item.approvedAt).toLocaleString('ar-SA', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  });

                  return (
                    <tr
                      key={item.distributionId}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 font-mono">
                          #{item.revision}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 max-w-[150px] truncate" title={item.distributionId}>
                        {item.distributionId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.routes.length}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.stops.length}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {totalWeight} كجم
                      </td>
                      <td className="py-3.5 px-4">
                        {distKm} كم
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{durMin} د</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.unassigned.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            {item.unassigned.length}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-mono">
                          <Gauge className="w-3.5 h-3.5 text-blue-600" />
                          <span>{item.optimizationScore}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onSelectDistribution(item.distributionId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض التفاصيل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalCount > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              إجمالي النتائج: <strong className="text-slate-800">{pagination.totalCount}</strong> خطة معتمدة
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!pagination.prevCursor || isLoadingHistory}
                onClick={() => fetchHistory(activeFilter, pagination.prevCursor, 'prev')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
              <button
                disabled={!pagination.hasMore || isLoadingHistory}
                onClick={() => fetchHistory(activeFilter, pagination.nextCursor, 'next')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      <DistributionComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        distributions={historyItems}
      />
    </div>
  );
};
