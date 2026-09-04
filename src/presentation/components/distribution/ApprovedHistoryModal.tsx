import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  Calendar,
  User,
  Truck,
  Scale,
  Navigation,
  Clock,
  Layers,
  FileSpreadsheet,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { ApprovedDistribution } from '../../../core/domain/entities/ApprovedDistribution';
import { Messages } from '../../../localization/messages';
import { container } from '../../../core/application/di/container';

interface ApprovedHistoryModalProps {
  messages: Messages;
  onClose: () => void;
  onRestoreSnapshot?: (snapshot: ApprovedDistribution) => void;
}

export const ApprovedHistoryModal: React.FC<ApprovedHistoryModalProps> = ({
  messages,
  onClose,
  onRestoreSnapshot
}) => {
  const d = messages.distribution;
  const [history, setHistory] = useState<ApprovedDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ApprovedDistribution | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const records = await container.distributionRepo.listApprovedDistributions();
        setHistory(records);
        if (records.length > 0) {
          setSelectedSnapshot(records[0]);
        }
      } catch (err) {
        console.error('Failed to load approved history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatKm = (meters: number): string => `${(meters / 1000).toFixed(1)} km`;
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{d.tabApprovedHistory}</h3>
              <p className="text-xs text-slate-500">سجل التوزيعات المعتمدة المحفوظة بشكل دائم وغير قابل للتعديل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-200 rtl:divide-x-reverse">
          {/* List of Approved Snapshots */}
          <div className="overflow-y-auto p-3 space-y-2 border-b md:border-b-0 border-slate-200">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">جاري تحميل السجلات...</div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 px-4">
                {d.noApprovedHistory}
                <p className="text-[11px] text-slate-400 mt-1">{d.noApprovedHistorySub}</p>
              </div>
            ) : (
              history.map((record) => {
                const isSelected = selectedSnapshot?.distributionId === record.distributionId;
                return (
                  <div
                    key={record.distributionId}
                    onClick={() => setSelectedSnapshot(record)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>نسخة #{record.revision}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {record.routes.length} سائق
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{new Date(record.approvedAt).toLocaleString('ar-EG')}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>{record.approvedBy}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Snapshot Details Panel */}
          <div className="md:col-span-2 overflow-y-auto p-5 bg-slate-50/50">
            {selectedSnapshot ? (
              <div className="space-y-4">
                {/* Snapshot Header */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        توزيع معتمد #{selectedSnapshot.revision}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        معتمد وغير قابل للتعديل
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>بواسطة: <strong>{selectedSnapshot.approvedBy}</strong></span>
                      <span>•</span>
                      <span>{new Date(selectedSnapshot.approvedAt).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>

                  {onRestoreSnapshot && (
                    <button
                      type="button"
                      onClick={() => onRestoreSnapshot(selectedSnapshot)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>تحميل للمعاينة</span>
                    </button>
                  )}
                </div>

                {/* Aggregated Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] font-medium">إجمالي الحمولة</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {(selectedSnapshot.metrics?.totalWeightKg ?? 0).toLocaleString()} كغم
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] font-medium">المسافة الفعلية</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                      {formatKm(selectedSnapshot.metrics?.totalDistanceMeters ?? 0)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] font-medium">زمن القيادة</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {formatTime(selectedSnapshot.metrics?.totalDurationSeconds ?? 0)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] font-medium">المحطات غير الموزعة</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                      {selectedSnapshot.unassigned.length}
                    </div>
                  </div>
                </div>

                {/* Driver Routes in this Snapshot */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">مسارات السائقين المعتمدة ({selectedSnapshot.routes.length}):</h4>
                  {selectedSnapshot.routes.map((rt) => (
                    <div
                      key={rt.driverId}
                      className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{rt.driverId}</span>
                        <span className="text-slate-500 mr-2">
                          ({rt.stopCount} محطة، {rt.listCount} قائمة)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
                        <span>{rt.totalWeightKg.toLocaleString()} كغم</span>
                        <span>•</span>
                        <span>{formatKm(rt.totalDistanceMeters)}</span>
                        <span>•</span>
                        <span>{Math.round(rt.utilizationPercent)}% استغلال</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">
                اختر توزيعًا معتمدًا من القائمة لعرض تفاصيله
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
