import React, { useState } from 'react';
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ApprovedDistribution } from '../../../core/domain/entities/ApprovedDistribution';
import { useDistributionHistoryStore } from '../../../state/distributionHistoryStore';

interface DistributionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributions: readonly ApprovedDistribution[];
}

export const DistributionComparisonModal: React.FC<DistributionComparisonModalProps> = ({
  isOpen,
  onClose,
  distributions
}) => {
  const {
    comparisonResult,
    isComparing,
    comparisonError,
    compareRevisions,
    clearComparison
  } = useDistributionHistoryStore();

  const [baseRev, setBaseRev] = useState<number>(
    distributions.length > 1 ? distributions[1].revision : (distributions[0]?.revision || 1)
  );
  const [targetRev, setTargetRev] = useState<number>(
    distributions.length > 0 ? distributions[0].revision : 1
  );
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompare = async () => {
    setLocalError(null);
    if (baseRev === targetRev) {
      setLocalError('يرجى اختيار مراجعتين مختلفتين للمقارنة (لا يمكن مقارنة المراجعة بنفسها).');
      return;
    }
    await compareRevisions(baseRev, targetRev);
  };

  const handleClose = () => {
    clearComparison();
    setLocalError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">مقارنة خطتي توزيع معتمدتين</h2>
              <p className="text-xs text-slate-500">تحليل الفروقات الرياضية بين نسختين من المراجعات التاريخية</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Selectors Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-5/12">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                خطة الأساس (Base Revision A)
              </label>
              <select
                value={baseRev}
                onChange={e => setBaseRev(parseInt(e.target.value, 10))}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {distributions.map(d => (
                  <option key={d.distributionId} value={d.revision}>
                    مراجعة #{d.revision} — ({new Date(d.approvedAt).toLocaleDateString('ar-SA')}) — {d.distributionId.substring(0, 12)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 font-bold hidden sm:block">
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </div>

            <div className="w-full sm:w-5/12">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الخطة المقارنة (Target Revision B)
              </label>
              <select
                value={targetRev}
                onChange={e => setTargetRev(parseInt(e.target.value, 10))}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {distributions.map(d => (
                  <option key={d.distributionId} value={d.revision}>
                    مراجعة #{d.revision} — ({new Date(d.approvedAt).toLocaleDateString('ar-SA')}) — {d.distributionId.substring(0, 12)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto pt-2 sm:pt-4">
              <button
                id="execute-comparison-btn"
                onClick={handleCompare}
                disabled={isComparing || distributions.length < 2}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <GitCompare className="w-4 h-4" />
                <span>{isComparing ? 'جاري التحليل...' : 'بدء المقارنة'}</span>
              </button>
            </div>
          </div>

          {/* Validation / Execution Errors */}
          {(localError || comparisonError) && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError || comparisonError}</span>
            </div>
          )}

          {/* Comparison Results Cards */}
          {comparisonResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Distance Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 mb-1">المسافة الكلية</div>
                  <div className="text-sm font-bold text-slate-800">
                    {Math.round((comparisonResult.targetMetrics.totalDistanceMeters / 1000) * 10) / 10} كم
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1.5">
                    الأساس: {Math.round((comparisonResult.baseMetrics.totalDistanceMeters / 1000) * 10) / 10} كم
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${
                    comparisonResult.differences.distanceDifferenceMeters < 0
                      ? 'text-emerald-600'
                      : comparisonResult.differences.distanceDifferenceMeters > 0
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}>
                    {comparisonResult.differences.distanceDifferenceMeters < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : comparisonResult.differences.distanceDifferenceMeters > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {Math.abs(Math.round((comparisonResult.differences.distanceDifferenceMeters / 1000) * 10) / 10)} كم
                      {comparisonResult.differences.distanceDifferenceMeters < 0 ? ' (توفير مسافة)' : comparisonResult.differences.distanceDifferenceMeters > 0 ? ' (زيادة مسافة)' : ''}
                    </span>
                  </div>
                </div>

                {/* Duration Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 mb-1">زمن القيادة</div>
                  <div className="text-sm font-bold text-slate-800">
                    {Math.round((comparisonResult.targetMetrics.totalDurationSeconds / 60) * 10) / 10} د
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1.5">
                    الأساس: {Math.round((comparisonResult.baseMetrics.totalDurationSeconds / 60) * 10) / 10} د
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${
                    comparisonResult.differences.durationDifferenceSeconds < 0
                      ? 'text-emerald-600'
                      : comparisonResult.differences.durationDifferenceSeconds > 0
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}>
                    {comparisonResult.differences.durationDifferenceSeconds < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : comparisonResult.differences.durationDifferenceSeconds > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {Math.abs(Math.round((comparisonResult.differences.durationDifferenceSeconds / 60) * 10) / 10)} دقيقة
                    </span>
                  </div>
                </div>

                {/* Weight Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 mb-1">الوزن المحمّل</div>
                  <div className="text-sm font-bold text-slate-800">
                    {comparisonResult.targetMetrics.totalWeightKg} كجم
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1.5">
                    الأساس: {comparisonResult.baseMetrics.totalWeightKg} كجم
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    الفرق: {comparisonResult.differences.weightDifferenceKg > 0 ? `+${comparisonResult.differences.weightDifferenceKg}` : comparisonResult.differences.weightDifferenceKg} كجم
                  </div>
                </div>

                {/* Objective Score Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500 mb-1">مؤشر كفاءة التحسين</div>
                  <div className="text-sm font-bold text-slate-800 font-mono">
                    {comparisonResult.targetMetrics.optimizationScore}
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1.5">
                    الأساس: {comparisonResult.baseMetrics.optimizationScore}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold font-mono ${
                    comparisonResult.differences.scoreDifference < 0
                      ? 'text-emerald-600'
                      : comparisonResult.differences.scoreDifference > 0
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}>
                    <span>
                      {comparisonResult.differences.scoreDifference > 0 ? `+${comparisonResult.differences.scoreDifference}` : comparisonResult.differences.scoreDifference}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Table of Metrics */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">المؤشر التشغيلي</th>
                      <th className="py-2.5 px-4 text-center">مراجعة #{comparisonResult.baseRevision} (الأساس)</th>
                      <th className="py-2.5 px-4 text-center">مراجعة #{comparisonResult.targetRevision} (المقارنة)</th>
                      <th className="py-2.5 px-4 text-center">الفارق الرياضي (Delta)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-4 font-medium">عدد السائقين النشطين</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.baseMetrics.driversUsed}</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.targetMetrics.driversUsed}</td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {comparisonResult.differences.driversDifference > 0 ? `+${comparisonResult.differences.driversDifference}` : comparisonResult.differences.driversDifference}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium">عدد المحطات المسندة</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.baseMetrics.stopsCount}</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.targetMetrics.stopsCount}</td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {comparisonResult.differences.stopsDifference > 0 ? `+${comparisonResult.differences.stopsDifference}` : comparisonResult.differences.stopsDifference}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium">عدد المحطات غير المسندة</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.baseMetrics.unassignedCount}</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.targetMetrics.unassignedCount}</td>
                      <td className={`py-2.5 px-4 text-center font-bold ${
                        comparisonResult.differences.unassignedDifference < 0
                          ? 'text-emerald-600'
                          : comparisonResult.differences.unassignedDifference > 0
                          ? 'text-red-600'
                          : 'text-slate-600'
                      }`}>
                        {comparisonResult.differences.unassignedDifference > 0 ? `+${comparisonResult.differences.unassignedDifference}` : comparisonResult.differences.unassignedDifference}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium">متوسط نسبة إشغال المركبات</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.baseMetrics.averageUtilizationPercent}%</td>
                      <td className="py-2.5 px-4 text-center">{comparisonResult.targetMetrics.averageUtilizationPercent}%</td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {comparisonResult.differences.utilizationDifferencePercent > 0 ? `+${comparisonResult.differences.utilizationDifferencePercent}` : comparisonResult.differences.utilizationDifferencePercent}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
