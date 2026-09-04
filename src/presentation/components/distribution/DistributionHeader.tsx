import React from 'react';
import {
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileCheck,
  History,
  Truck,
  Layers,
  Scale,
  Navigation,
  Clock,
  Award
} from 'lucide-react';
import { Messages } from '../../../localization/messages';
import { DistributionWorkflowStatus } from '../../../state/distributionStore';
import { InvariantValidationResult } from '../../../core/domain/services/DistributionValidator';
import { DomainDistributionWarning } from '../../../core/domain/services/distribution/DistributionWarningService';
import { ObjectiveScoreBreakdown } from '../../../core/domain/services/OptimizationEvaluationService';

interface DistributionHeaderProps {
  messages: Messages;
  status: DistributionWorkflowStatus;
  progress: { completed: number; total: number; message: string } | null;
  driversCount: number;
  stopsCount: number;
  listsCount: number;
  totalWeightKg: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  scoreBreakdown: ObjectiveScoreBreakdown | null;
  validation: InvariantValidationResult | null;
  warnings: readonly DomainDistributionWarning[];
  historyCount: number;
  revision?: number;
  onRecalculate: () => void;
  onUndo: () => void;
  onOpenApproveModal: () => void;
  onOpenHistory: () => void;
}

export const DistributionHeader: React.FC<DistributionHeaderProps> = ({
  messages,
  status,
  progress,
  driversCount,
  stopsCount,
  listsCount,
  totalWeightKg,
  totalDistanceMeters,
  totalDurationSeconds,
  scoreBreakdown,
  validation,
  warnings,
  historyCount,
  revision,
  onRecalculate,
  onUndo,
  onOpenApproveModal,
  onOpenHistory
}) => {
  const d = messages.distribution;

  const hasErrors = (validation && !validation.isValid) || warnings.some(w => w.severity === 'error');
  const hasWarnings = warnings.some(w => w.severity === 'warning');
  const isApproved = status === 'approved';
  const isBusy = status === 'calculating_routes' || status === 'mutating' || status === 'approving';

  // Format distance
  const formatKm = (meters: number): string => {
    return `${(meters / 1000).toFixed(1)} ${messages.common.km}`;
  };

  // Format duration
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs} ${messages.common.hours} ${remMins > 0 ? `${remMins} ${messages.common.minutes}` : ''}`;
    }
    return `${mins} ${messages.common.minutes}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Top Title & Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{d.title}</h1>
                  {revision && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {d.revisionNumber} {revision}
                    </span>
                  )}
                  {isApproved && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {d.approvedBadge}
                    </span>
                  )}
                  {hasErrors && !isApproved && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertOctagon className="h-3 w-3" />
                      مخالفات تشغيلية
                    </span>
                  )}
                  {!hasErrors && hasWarnings && !isApproved && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      تنبيهات تدقيق
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{d.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* History Button */}
            <button
              id="distribution-history-btn"
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              title={d.tabApprovedHistory}
            >
              <History className="h-4 w-4 text-slate-600" />
              <span>{d.tabApprovedHistory}</span>
            </button>

            {/* Undo Button */}
            <button
              id="distribution-undo-btn"
              onClick={onUndo}
              disabled={historyCount === 0 || isBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title={`${d.undo} (${historyCount})`}
            >
              <RotateCcw className="h-4 w-4 text-slate-600" />
              <span>{d.undo}</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Recalculate Road Routes Button */}
            <button
              id="distribution-recalc-btn"
              onClick={onRecalculate}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 text-blue-600 ${isBusy ? 'animate-spin' : ''}`} />
              <span>{d.recalculateAll}</span>
            </button>

            {/* Approve Final Distribution Button */}
            <button
              id="distribution-approve-btn"
              onClick={onOpenApproveModal}
              disabled={hasErrors || isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{d.approveDistribution}</span>
            </button>
          </div>
        </div>

        {/* Real-time Progress Bar */}
        {progress && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-blue-900 font-medium mb-1.5">
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span>{progress.message}</span>
              </span>
              <span>{Math.round((progress.completed / Math.max(1, progress.total)) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(progress.completed / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Operational Key Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Truck className="h-3.5 w-3.5 text-blue-600" />
              <span>{d.driversCount}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{driversCount}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>{d.stopsCount}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{stopsCount}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Layers className="h-3.5 w-3.5 text-purple-600" />
              <span>{d.listsCount}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{listsCount}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Scale className="h-3.5 w-3.5 text-emerald-600" />
              <span>{d.totalPayload}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {totalWeightKg.toLocaleString()} {messages.common.kg}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
              <span>{d.totalDistance}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatKm(totalDistanceMeters)}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>{d.totalDuration}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatTime(totalDurationSeconds)}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Award className="h-3.5 w-3.5 text-rose-600" />
              <span>{d.objectiveScore}</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1 font-mono">
              {scoreBreakdown ? scoreBreakdown.finalScore.toFixed(3) : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
