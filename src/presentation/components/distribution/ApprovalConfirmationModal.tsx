import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Truck,
  Layers,
  Scale,
  Navigation,
  Clock,
  UserCheck
} from 'lucide-react';
import { Messages } from '../../../localization/messages';

interface ApprovalConfirmationModalProps {
  driversCount: number;
  stopsCount: number;
  listsCount: number;
  totalWeightKg: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  unassignedCount: number;
  messages: Messages;
  onConfirm: (approvedBy: string, notes?: string) => Promise<void>;
  onClose: () => void;
}

export const ApprovalConfirmationModal: React.FC<ApprovalConfirmationModalProps> = ({
  driversCount,
  stopsCount,
  listsCount,
  totalWeightKg,
  totalDistanceMeters,
  totalDurationSeconds,
  unassignedCount,
  messages,
  onConfirm,
  onClose
}) => {
  const d = messages.distribution;

  const [approvedBy, setApprovedBy] = useState<string>('مأمور التوزيع الرئيسي');
  const [notes, setNotes] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatKm = (meters: number): string => {
    return `${(meters / 1000).toFixed(1)} ${messages.common.km}`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs} ${messages.common.hours} ${remMins > 0 ? `${remMins} ${messages.common.minutes}` : ''}`;
    }
    return `${mins} ${messages.common.minutes}`;
  };

  const handleConfirm = async () => {
    if (!approvedBy.trim()) {
      setError('يرجى كتابة اسم أو صفة الشخص المعتمد للتوزيع.');
      return;
    }

    try {
      setIsApproving(true);
      setError(null);
      await onConfirm(approvedBy.trim(), notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || messages.common.error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">{d.confirmApprovalTitle}</h3>
              <p className="text-xs text-emerald-800/80">توثيق وحفظ نسخة غير قابلة للتعديل في Firestore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {d.confirmApprovalMessage}
          </p>

          {/* Operational Snapshot Metrics */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>السائقون الموزع عليهم (Drivers):</span>
              </span>
              <strong className="text-slate-900 font-mono text-sm">{driversCount}</strong>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>المحطات والقوائم (Stops & Lists):</span>
              </span>
              <strong className="text-slate-900 font-mono text-sm">{stopsCount} محطة ({listsCount} قائمة)</strong>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Scale className="h-4 w-4 text-emerald-600" />
                <span>إجمالي الحمولة (Weight):</span>
              </span>
              <strong className="text-slate-900 font-mono text-sm">{totalWeightKg.toLocaleString()} {messages.common.kg}</strong>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Navigation className="h-4 w-4 text-blue-600" />
                <span>المسافة الطرقية الإجمالية (Distance):</span>
              </span>
              <strong className="text-slate-900 font-mono text-sm">{formatKm(totalDistanceMeters)}</strong>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>زمن القيادة الإجمالي (Driving Time):</span>
              </span>
              <strong className="text-slate-900 font-mono text-sm">{formatTime(totalDurationSeconds)}</strong>
            </div>

            <div className="flex justify-between items-center text-slate-700 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className={`h-4 w-4 ${unassignedCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>محطات غير موزعة (Unassigned Stops):</span>
              </span>
              <strong className={`font-mono text-sm ${unassignedCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {unassignedCount}
              </strong>
            </div>
          </div>

          {/* Signoff inputs */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اسم أو هوية المعتمد (Approved By) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 pr-9 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="مثال: مأمور التوزيع أحمد"
                />
                <UserCheck className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ملاحظات أو تعليقات الاعتماد (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="أي توجيهات تشغيلية إضافية للسائقين..."
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isApproving}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            id="confirm-approve-save-btn"
            onClick={handleConfirm}
            disabled={isApproving}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isApproving ? d.approvingDistribution : 'تأكيد وحفظ الاعتماد'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
