import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  ArrowRightLeft,
  Scale,
  MapPin,
  Layers,
  HelpCircle
} from 'lucide-react';
import { DeliveryStop } from '../../../core/domain/entities/DeliveryStop';
import { Messages } from '../../../localization/messages';

export type UnassignedStopReason = 'OVERSIZED_LIST' | 'ROUTING_UNAVAILABLE' | 'NO_CAPACITY_FIT' | string;

interface UnassignedStopsPanelProps {
  unassignedStops: readonly DeliveryStop[];
  reasons?: ReadonlyMap<string, UnassignedStopReason>;
  messages: Messages;
  onAssignStop: (stop: DeliveryStop) => void;
}

export const UnassignedStopsPanel: React.FC<UnassignedStopsPanelProps> = ({
  unassignedStops,
  reasons,
  messages,
  onAssignStop
}) => {
  const d = messages.distribution;

  if (unassignedStops.length === 0) {
    return null;
  }

  const getReasonLabel = (stopId: string, weightKg: number) => {
    const reason = reasons?.get(stopId);
    if (reason === 'OVERSIZED_LIST') {
      return {
        label: d.reasonOversized,
        badge: 'وزن فائق (Oversized)',
        color: 'bg-rose-100 text-rose-800 border-rose-200'
      };
    }
    if (reason === 'ROUTING_UNAVAILABLE') {
      return {
        label: d.reasonRoutingUnavailable,
        badge: 'مسار طرقي غير متوفر',
        color: 'bg-amber-100 text-amber-800 border-amber-200'
      };
    }
    return {
      label: d.reasonNoDriver,
      badge: 'عدم توفر سعة شاغرة',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    };
  };

  return (
    <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
      <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-600 flex items-center justify-center text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">
              {d.unassignedStopsTitle} ({unassignedStops.length})
            </h3>
            <p className="text-xs text-amber-800/80">{d.unassignedStopsSubtitle}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
          تتطلب تدقيق المأمور
        </span>
      </div>

      <div className="p-4 divide-y divide-slate-100">
        {unassignedStops.map((stop) => {
          const { label, badge, color } = getReasonLabel(stop.stopId, stop.totalWeightKg);

          return (
            <div
              key={stop.stopId}
              id={`unassigned-stop-${stop.stopId}`}
              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{stop.buyerName}</span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {stop.buyerCode}
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {stop.totalWeightKg.toLocaleString()} {messages.common.kg}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${color}`}>
                    {badge}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-slate-400" />
                    {stop.lists.length} قوائم مدمجة
                  </span>
                  <span>•</span>
                  <span className="text-amber-800 font-medium">{label}</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onAssignStop(stop)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>محاولة إسناد يدوي</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
