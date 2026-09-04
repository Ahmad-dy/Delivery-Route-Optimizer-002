import React from 'react';
import {
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  Warehouse,
  Package,
  Layers,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Route } from '../../../core/domain/entities/Route';
import { DeliveryStop } from '../../../core/domain/entities/DeliveryStop';
import { Depot } from '../../../core/domain/entities/Depot';
import { Messages } from '../../../localization/messages';

interface RouteStopListProps {
  route: Route;
  depot: Depot | null;
  messages: Messages;
  onMoveStop: (stop: DeliveryStop) => void;
  onReorder: (newOrderedStopIds: readonly string[]) => void;
}

export const RouteStopList: React.FC<RouteStopListProps> = ({
  route,
  depot,
  messages,
  onMoveStop,
  onReorder
}) => {
  const d = messages.distribution;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const stopIds = route.orderedStops.map(s => s.stopId);
    const temp = stopIds[index - 1];
    stopIds[index - 1] = stopIds[index];
    stopIds[index] = temp;
    onReorder(stopIds);
  };

  const handleMoveDown = (index: number) => {
    if (index >= route.orderedStops.length - 1) return;
    const stopIds = route.orderedStops.map(s => s.stopId);
    const temp = stopIds[index + 1];
    stopIds[index + 1] = stopIds[index];
    stopIds[index] = temp;
    onReorder(stopIds);
  };

  // Helper to format distance
  const formatKm = (meters: number): string => {
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Helper to format duration
  const formatTime = (seconds: number): string => {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">{d.stopSequence} ({route.stopCount} محطة)</h3>
        </div>
        <span className="text-xs text-slate-500">
          مسار دائري كامل: المستودع → المحطات → المستودع
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* 1. Origin Depot Waypoint */}
        <div className="flex items-start gap-3 p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
            0
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-950">
                {depot?.name ?? 'المستودع المركزي'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                نقطة الانطلاق (Departure Hub)
              </span>
            </div>
            {depot && (
              <div className="text-[11px] text-blue-800/80 mt-0.5 font-mono">
                {depot.latitude.toFixed(5)}, {depot.longitude.toFixed(5)}
              </div>
            )}
          </div>
        </div>

        {/* Empty Route Notice */}
        {route.orderedStops.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            لا توجد محطات مسندة لهذا السائق حاليًا.
          </div>
        )}

        {/* 2. Ordered Delivery Stops */}
        {route.orderedStops.map((stop, index) => {
          const leg = route.legs?.[index]; // Leg from previous waypoint to this stop
          const isFirst = index === 0;
          const isLast = index === route.orderedStops.length - 1;

          return (
            <div
              key={stop.stopId}
              id={`stop-item-${stop.stopId}`}
              className="border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 bg-white transition group relative"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Sequence Number & Stop Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {stop.buyerName}
                      </h4>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {stop.buyerCode}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {stop.totalWeightKg.toLocaleString()} {messages.common.kg}
                      </span>
                    </div>

                    {/* Coordinates & Road Leg ETA */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                      </span>

                      {leg && (
                        <span className="flex items-center gap-2 text-blue-700 text-[11px] font-sans font-medium bg-blue-50/70 px-2 py-0.5 rounded">
                          <Navigation className="h-3 w-3" />
                          <span>{formatKm(leg.distanceMeters)}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(leg.durationSeconds)}</span>
                        </span>
                      )}
                    </div>

                    {/* Merged Lists Display (Rule: show individual lists and weights, but atomic stop) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1 mb-1">
                        <Layers className="h-3 w-3 text-slate-400" />
                        <span>{d.buyerLists} ({stop.lists.length} قائمة):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stop.lists.map((lst) => (
                          <span
                            key={lst.listNumber}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <span className="font-semibold text-slate-900 font-mono">{lst.listNumber}</span>
                            <span className="text-slate-500">({lst.weightKg} {messages.common.kg})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stop Action Buttons: Reorder & Reassign */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={isFirst}
                    className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition"
                    title={d.moveUp}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLast}
                    className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition"
                    title={d.moveDown}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onMoveStop(stop)}
                    className="p-1.5 rounded text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition border border-transparent hover:border-blue-200"
                    title={d.moveStop}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* 3. Destination Return to Depot Waypoint */}
        <div className="flex items-start gap-3 p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
            {route.stopCount + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-950">
                {depot?.name ?? 'المستودع المركزي'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                نقطة العودة والختام (Return to Hub)
              </span>
            </div>
            {depot && (
              <div className="text-[11px] text-blue-800/80 mt-0.5 font-mono">
                {depot.latitude.toFixed(5)}, {depot.longitude.toFixed(5)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
