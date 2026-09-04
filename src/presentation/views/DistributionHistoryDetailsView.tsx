import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowRight,
  History as HistoryIcon,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Lock,
  Calendar,
  User,
  Warehouse,
  Truck,
  MapPin,
  Clock,
  Gauge,
  Layers,
  AlertCircle,
  CheckCircle2,
  Download,
  Printer
} from 'lucide-react';
import { useDistributionHistoryStore } from '../../state/distributionHistoryStore';
import { Messages } from '../../localization/messages';
import { FullRouteMapView } from '../components/distribution/FullRouteMapView';
import { AuditTrailModal } from '../components/distribution/AuditTrailModal';

interface DistributionHistoryDetailsViewProps {
  distributionId: string;
  onBack: () => void;
  messages: Messages;
}

const DRIVER_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Amber
  '#9333ea', // Purple
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#be185d', // Pink
  '#ea580c', // Orange
  '#059669'  // Emerald
];

export const DistributionHistoryDetailsView: React.FC<DistributionHistoryDetailsViewProps> = ({
  distributionId,
  onBack,
  messages
}) => {
  const {
    selectedDistribution,
    isLoadingDetails,
    detailsError,
    selectDistribution,
    exportSelectedToExcel,
    exportSelectedToPdf
  } = useDistributionHistoryStore();

  const [activeTab, setActiveTab] = useState<'routes' | 'stops' | 'map'>('routes');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    selectDistribution(distributionId);
  }, [distributionId, selectDistribution]);

  const driverColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (selectedDistribution) {
      selectedDistribution.routes.forEach((route, idx) => {
        map.set(route.driverId, DRIVER_COLORS[idx % DRIVER_COLORS.length]);
      });
    }
    return map;
  }, [selectedDistribution]);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const res = await exportSelectedToExcel();
      if (res) {
        setExportSuccess(`تم تحميل ملف Excel بنجاح: ${res.filename}`);
      }
    } catch (err: any) {
      setExportError(err.message || 'فشل في تصدير ملف Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const res = await exportSelectedToPdf();
      if (res) {
        setExportSuccess('تم تجهيز أمر التوزيع للطباعة بنجاح.');
      }
    } catch (err: any) {
      setExportError(err.message || 'فشل في تصدير أمر التوزيع (PDF).');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-sm text-slate-500">جاري قراءة اللقطة التاريخية المعتمدة وتدقيق السجلات...</p>
      </div>
    );
  }

  if (detailsError || !selectedDistribution) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-red-800">تعذر تحميل لقطة التوزيع المعتمدة</h2>
          <p className="text-xs text-red-600">{detailsError || 'اللقطة المطلوبة غير موجودة في الأرشيف.'}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            <span>الرجوع إلى السجل</span>
          </button>
        </div>
      </div>
    );
  }

  const dist = selectedDistribution;
  const distKm = Math.round((dist.metrics.finalDistanceMeters / 1000) * 10) / 10;
  const durMin = Math.round((dist.metrics.totalDurationSeconds / 60) * 10) / 10;
  const totalWeightKg = Math.round(
    dist.routes.reduce((sum, r) => sum + r.totalWeightKg, 0) * 10
  ) / 10;
  const approvedDateStr = new Date(dist.approvedAt).toLocaleString('ar-SA', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Top Read-Only Guarantee Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors ml-2"
              title="الرجوع للسجل"
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              مراجعة #{dist.revision}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              لقطة معتمدة غير قابلة للتعديل (Read-Only)
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>خطة التوزيع المعتمدة</span>
            <span className="font-mono text-xs text-slate-400">({dist.distributionId})</span>
          </h1>
          <p className="text-xs text-slate-400">
            تم الاعتماد بتاريخ: {approvedDateStr} {dist.approvedBy ? `بواسطة (${dist.approvedBy})` : ''}
          </p>
        </div>

        {/* Action Buttons: Audit Trail, Export Excel, Export PDF */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            id="open-audit-trail-btn"
            onClick={() => setIsAuditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>سجل التدقيق</span>
          </button>

          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExportingExcel ? 'جاري التصدير...' : 'تصدير Excel'}</span>
          </button>

          <button
            id="export-pdf-btn"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{isExportingPdf ? 'جاري التجهيز...' : 'طباعة أمر التوزيع (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Export Notifications */}
      {exportSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}
      {exportError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Executive Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 mb-1">المسافة الكلية</div>
          <div className="text-base font-bold text-slate-900">{distKm} كم</div>
          <div className="text-[10px] text-slate-400 mt-1">مسار فعلي على الطرق</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 mb-1">زمن القيادة الكلي</div>
          <div className="text-base font-bold text-slate-900">{durMin} دقيقة</div>
          <div className="text-[10px] text-slate-400 mt-1">~{(durMin / 60).toFixed(1)} ساعة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 mb-1">إجمالي الحمولات</div>
          <div className="text-base font-bold text-slate-900">{totalWeightKg} كجم</div>
          <div className="text-[10px] text-slate-400 mt-1">موزعة على الأسطول</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 mb-1">السائقون والمحطات</div>
          <div className="text-base font-bold text-slate-900">
            {dist.routes.length} سائقين / {dist.stops.length} محطة
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            غير مسند: <strong className={dist.unassigned.length > 0 ? 'text-red-600' : 'text-emerald-600'}>{dist.unassigned.length}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 mb-1">مؤشر التحسين الكلي</div>
          <div className="text-base font-bold text-blue-700 font-mono">{dist.optimizationScore}</div>
          <div className="text-[10px] text-slate-400 mt-1">دالة التكلفة الموزونة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 mb-1">المستودع المركزي</div>
          <div className="text-xs font-mono font-medium text-slate-800 truncate" title={`${dist.depot.latitude}, ${dist.depot.longitude}`}>
            {dist.depot.latitude.toFixed(4)}, {dist.depot.longitude.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">نقطة الانطلاق والعودة</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 pt-3 bg-slate-50/50 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('routes')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'routes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              ملخص مسارات السائقين ({dist.routes.length})
            </button>
            <button
              onClick={() => setActiveTab('stops')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'stops'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              جدول المحطات التفصيلي ({dist.stops.length})
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'map'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              الخريطة الجغرافية للمسارات
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tab 1: Routes Summary */}
          {activeTab === 'routes' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">السائق</th>
                    <th className="py-3 px-4">عدد المحطات</th>
                    <th className="py-3 px-4">الحمولة الإجمالية</th>
                    <th className="py-3 px-4">السعة القصوى</th>
                    <th className="py-3 px-4">نسبة الإشغال</th>
                    <th className="py-3 px-4">المسافة</th>
                    <th className="py-3 px-4">زمن القيادة</th>
                    <th className="py-3 px-4">حالة المسار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dist.routes.map(r => {
                    const driver = dist.drivers.find(d => d.driverId === r.driverId);
                    const color = driverColorMap.get(r.driverId) || '#2563eb';
                    const maxCap = driver?.maximumLoadKg || 1000;
                    const utilPercent = Math.min(100, Math.round((r.totalWeightKg / maxCap) * 100));
                    const rDistKm = Math.round((r.totalDistanceMeters / 1000) * 10) / 10;
                    const rDurMin = Math.round((r.totalDurationSeconds / 60) * 10) / 10;

                    return (
                      <tr key={r.driverId} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                            <span>{driver?.driverName || r.driverId}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({r.driverId})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{r.orderedStops.length} محطة</td>
                        <td className="py-3 px-4 font-semibold">{r.totalWeightKg} كجم</td>
                        <td className="py-3 px-4 text-slate-500">{maxCap} كجم</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${utilPercent > 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${utilPercent}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold text-[11px]">{utilPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{rDistKm} كم</td>
                        <td className="py-3 px-4">{rDurMin} دقيقة</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.routingStatus === 'OK'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {r.routingStatus === 'OK' ? 'طرق مؤكدة' : r.routingStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Detailed Stops Table */}
          {activeTab === 'stops' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-3">الترتيب</th>
                    <th className="py-3 px-3">السائق المسند</th>
                    <th className="py-3 px-3">كود المشتري</th>
                    <th className="py-3 px-3">اسم المشتري (المحل)</th>
                    <th className="py-3 px-3">أرقام القوائم</th>
                    <th className="py-3 px-3">الوزن</th>
                    <th className="py-3 px-3">الإحداثيات</th>
                    <th className="py-3 px-3">المسافة من المحطة السابقة</th>
                    <th className="py-3 px-3">زمن الوصول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dist.routes.flatMap(r =>
                    r.orderedStops.map((stop, sIdx) => {
                      const driver = dist.drivers.find(d => d.driverId === r.driverId);
                      const color = driverColorMap.get(r.driverId) || '#2563eb';
                      const leg = r.legs?.[sIdx];
                      const legDistKm = leg ? `${Math.round((leg.distanceMeters / 1000) * 10) / 10} كم` : '-';
                      const legDurMin = leg ? `${Math.round((leg.durationSeconds / 60) * 10) / 10} دقيقة` : '-';
                      const listNumbers = stop.lists && Array.isArray(stop.lists)
                        ? stop.lists.map(l => (typeof l === 'string' ? l : (l.listNumber || ''))).filter(Boolean).join(', ')
                        : ((stop as any).listNumbers ? (stop as any).listNumbers.join(', ') : '');

                      return (
                        <tr key={`${r.driverId}-${stop.buyerCode}-${sIdx}`} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold font-mono text-blue-600">
                            #{sIdx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                              <span className="font-medium text-slate-800">{driver?.driverName || r.driverId}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium">{stop.buyerCode}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{stop.buyerName}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {listNumbers}
                          </td>
                          <td className="py-2.5 px-3 font-bold">{stop.totalWeightKg} كجم</td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                            {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3">{legDistKm}</td>
                          <td className="py-2.5 px-3">{legDurMin}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Historical Map View */}
          {activeTab === 'map' && (
            <div className="h-[600px] rounded-xl overflow-hidden border border-slate-200">
              <FullRouteMapView
                routes={dist.routes}
                depot={dist.depot}
                driverColors={driverColorMap}
                messages={messages}
              />
            </div>
          )}
        </div>
      </div>

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        distributionId={dist.distributionId}
        revision={dist.revision}
      />
    </div>
  );
};
