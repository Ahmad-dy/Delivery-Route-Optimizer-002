import React from 'react';
import {
  Truck,
  Phone,
  Navigation,
  Clock,
  Layers,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Eye
} from 'lucide-react';
import { Route } from '../../../core/domain/entities/Route';
import { Driver } from '../../../core/domain/entities/Driver';
import { Messages } from '../../../localization/messages';
import { CapacityDomainService } from '../../../core/domain/services/CapacityDomainService';

interface DriverRouteCardProps {
  route: Route;
  driver?: Driver;
  color: string;
  isSelected: boolean;
  isExpanded: boolean;
  messages: Messages;
  onToggleExpand: () => void;
  onSelect: () => void;
  onFocusOnMap?: () => void;
}

export const DriverRouteCard: React.FC<DriverRouteCardProps> = ({
  route,
  driver,
  color,
  isSelected,
  isExpanded,
  messages,
  onToggleExpand,
  onSelect,
  onFocusOnMap
}) => {
  const d = messages.distribution;
  const nominal = driver?.maximumLoadKg ?? 1000;
  const operationalLimit = CapacityDomainService.calculateOperationalLimit(nominal);
  const utilization = Math.round(route.utilizationPercent);

  const isOverCapacity = route.totalWeightKg > operationalLimit;
  const isInBufferZone = route.totalWeightKg > nominal && !isOverCapacity;
  const isRoutingFailed = route.routingStatus === 'ROUTING_UNAVAILABLE';

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
    <div
      id={`driver-card-${route.driverId}`}
      className={`rounded-xl border transition-all duration-200 overflow-hidden bg-white shadow-sm ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-400'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Driver Header Banner */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50/70 transition flex items-center justify-between"
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          {/* Driver Route Color Badge */}
          <div
            className="w-3.5 h-10 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
            title={`مسار السائق: ${driver?.driverName ?? route.driverId}`}
          />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {driver?.driverName ?? route.driverId}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {route.driverId}
              </span>
              {route.isManuallyModified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                  معدل يدويًا
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {driver?.vehiclePlate && <span>{driver.vehiclePlate}</span>}
              {driver?.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {driver.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicators & Expand Toggle */}
        <div className="flex items-center gap-2">
          {isRoutingFailed ? (
            <span
              className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"
              title={route.routingErrorMessage ?? 'Routing Unavailable'}
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span>ROUTING_UNAVAILABLE</span>
            </span>
          ) : (
            <span className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Google Routes OK</span>
            </span>
          )}

          {onFocusOnMap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFocusOnMap();
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
              title={d.viewOnMap}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Payload & Capacity Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-b border-slate-100">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-600 font-medium">
            الحمولة: <strong className="text-slate-900">{route.totalWeightKg.toLocaleString()}</strong> / {nominal.toLocaleString()} {messages.common.kg}
            <span className="text-slate-400 font-normal"> (أقصى: {operationalLimit.toLocaleString()})</span>
          </span>
          <span
            className={`font-bold font-mono text-xs ${
              isOverCapacity
                ? 'text-rose-600'
                : isInBufferZone
                ? 'text-amber-600'
                : 'text-slate-700'
            }`}
          >
            {utilization}%
          </span>
        </div>

        {/* Progress bar with nominal (100%) and 110% operational line */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverCapacity
                ? 'bg-rose-600'
                : isInBufferZone
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(100, (route.totalWeightKg / operationalLimit) * 100)}%` }}
          />
        </div>

        {/* Capacity Violations / Warnings */}
        {isOverCapacity && (
          <div className="mt-2 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>تجاوز الحد التشغيلي (110%): {route.totalWeightKg} كغم يتجاوز {operationalLimit} كغم!</span>
          </div>
        )}
        {isInBufferZone && (
          <div className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>يعمل في هامش الـ 10% التشغيلي الإضافي ({route.totalWeightKg} كغم).</span>
          </div>
        )}
      </div>

      {/* Route Road Metrics */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 rtl:divide-x-reverse px-2 py-2 text-center text-xs">
        <div className="p-1">
          <div className="text-[10px] text-slate-400 font-medium">المحطات</div>
          <div className="font-bold text-slate-800 mt-0.5">{route.stopCount}</div>
        </div>
        <div className="p-1">
          <div className="text-[10px] text-slate-400 font-medium">القوائم</div>
          <div className="font-bold text-slate-800 mt-0.5">{route.listCount}</div>
        </div>
        <div className="p-1">
          <div className="text-[10px] text-slate-400 font-medium">المسافة الفعلية</div>
          <div className="font-bold text-slate-800 mt-0.5 font-mono">
            {isRoutingFailed ? '—' : formatKm(route.totalDistanceMeters)}
          </div>
        </div>
        <div className="p-1">
          <div className="text-[10px] text-slate-400 font-medium">زمن القيادة</div>
          <div className="font-bold text-slate-800 mt-0.5">
            {isRoutingFailed ? '—' : formatTime(route.totalDurationSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
};
