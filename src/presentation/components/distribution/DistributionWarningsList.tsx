import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { DomainDistributionWarning } from '../../../core/domain/services/distribution/DistributionWarningService';
import { InvariantValidationResult } from '../../../core/domain/services/DistributionValidator';
import { Messages } from '../../../localization/messages';

interface DistributionWarningsListProps {
  warnings: readonly DomainDistributionWarning[];
  validation: InvariantValidationResult | null;
  messages: Messages;
}

export const DistributionWarningsList: React.FC<DistributionWarningsListProps> = ({
  warnings,
  validation,
  messages
}) => {
  const errors = warnings.filter(w => w.severity === 'error');
  const alertWarnings = warnings.filter(w => w.severity === 'warning');
  const infos = warnings.filter(w => w.severity === 'info');

  const invariantErrors = validation?.violations ?? [];

  if (warnings.length === 0 && invariantErrors.length === 0) {
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
        <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <span className="font-medium">
          كافة القيود التشغيلية سليمة تمامًا 100%: السعات ضمن حد الـ 110%، عدم تجزئة المحطات محقق، والمسارات الطرقية معتمدة.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Hard Invariant Violations */}
      {invariantErrors.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
            <AlertOctagon className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>مخالفات جوهرية تحجب اعتماد التوزيع النهائي ({invariantErrors.length}):</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-800 space-y-1 pr-2">
            {invariantErrors.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Domain Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-rose-800">
              <AlertOctagon className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Domain Warnings */}
      {alertWarnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>تنبيهات تشغيلية للمراجعة:</span>
          </div>
          {alertWarnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <span>{warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Informational Notes */}
      {infos.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
          {infos.map((info, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-blue-800">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>{info.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
