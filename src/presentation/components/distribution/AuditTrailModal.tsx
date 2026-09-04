import React, { useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  User,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Eye,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useAuditStore } from '../../../state/auditStore';
import { AuditEventType } from '../../../core/domain/entities/AuditEvent';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributionId?: string;
  revision?: number;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  distributionId,
  revision
}) => {
  const { events, isLoading, error, fetchAuditTrail, clearAuditTrail } = useAuditStore();

  useEffect(() => {
    if (isOpen) {
      fetchAuditTrail(distributionId ? { distributionId } : undefined);
    } else {
      clearAuditTrail();
    }
  }, [isOpen, distributionId, fetchAuditTrail, clearAuditTrail]);

  if (!isOpen) return null;

  const getEventBadge = (type: AuditEventType) => {
    switch (type) {
      case 'DISTRIBUTION_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            اعتماد التوزيع
          </span>
        );
      case 'DISTRIBUTION_EXPORTED_EXCEL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
            <FileSpreadsheet className="w-3 h-3" />
            تصدير Excel
          </span>
        );
      case 'DISTRIBUTION_EXPORTED_PDF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <FileText className="w-3 h-3" />
            تصدير PDF
          </span>
        );
      case 'DISTRIBUTION_VIEWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Eye className="w-3 h-3" />
            عرض تفاصيل
          </span>
        );
      case 'MANUAL_STOP_REASSIGNED':
      case 'MANUAL_STOP_REORDERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Activity className="w-3 h-3" />
            تعديل يدوي
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Activity className="w-3 h-3" />
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">سجل التدقيق الأمني (Audit Trail)</h2>
              <p className="text-xs text-slate-500">
                {distributionId
                  ? `أرشيف العمليات غير القابل للتعديل للخطة ${distributionId.substring(0, 16)}... ${revision ? `(مراجعة #${revision})` : ''}`
                  : 'أرشيف العمليات غير القابل للتعديل'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
              <p className="text-xs">جاري تحميل سجل التدقيق...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">لا توجد أحداث تدقيق مسجلة لهذه الخطة بعد.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {events.map(ev => {
                const dateFormatted = new Date(ev.createdAt).toLocaleString('ar-SA', {
                  dateStyle: 'medium',
                  timeStyle: 'medium'
                });

                return (
                  <div key={ev.eventId} className="p-3.5 hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getEventBadge(ev.eventType)}
                        <span className="text-[11px] font-mono text-slate-500">#{ev.eventId.substring(0, 10)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dateFormatted}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.userEmail || ev.userId}</span>
                      </div>
                      {ev.metadata && (
                        <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                          {JSON.stringify(ev.metadata).substring(0, 60)}...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
