import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Warehouse,
  Truck,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Navigation
} from 'lucide-react';
import { Route } from '../../../core/domain/entities/Route';
import { Depot } from '../../../core/domain/entities/Depot';
import { DeliveryStop } from '../../../core/domain/entities/DeliveryStop';
import { Messages } from '../../../localization/messages';

interface FullRouteMapViewProps {
  routes: readonly Route[];
  depot: Depot | null;
  driverColors: ReadonlyMap<string, string>;
  selectedDriverId?: string | null;
  messages: Messages;
}

export const FullRouteMapView: React.FC<FullRouteMapViewProps> = ({
  routes,
  depot,
  driverColors,
  selectedDriverId,
  messages
}) => {
  const d = messages.distribution;

  // Active visible layers per driverId
  const [visibleDrivers, setVisibleDrivers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    routes.forEach(r => { init[r.driverId] = true; });
    return init;
  });

  // Hovered stop for popup
  const [activeStop, setActiveStop] = useState<{
    stop: DeliveryStop;
    driverId: string;
    seq: number;
  } | null>(null);

  const toggleDriverVisibility = (driverId: string) => {
    setVisibleDrivers(prev => ({ ...prev, [driverId]: !prev[driverId] }));
  };

  const toggleAll = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    routes.forEach(r => { next[r.driverId] = visible; });
    setVisibleDrivers(next);
  };

  // Collect all points for computing viewport bounds
  const bounds = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];
    if (depot) {
      points.push({ lat: depot.latitude, lng: depot.longitude });
    }
    routes.forEach(r => {
      r.orderedStops.forEach(s => {
        points.push({ lat: s.latitude, lng: s.longitude });
      });
    });

    if (points.length === 0) {
      return { minLat: 31.9, maxLat: 32.1, minLng: 35.1, maxLng: 35.3 };
    }

    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;

    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    // Add padding margin
    const latSpan = Math.max(0.01, maxLat - minLat);
    const lngSpan = Math.max(0.01, maxLng - minLng);

    return {
      minLat: minLat - latSpan * 0.1,
      maxLat: maxLat + latSpan * 0.1,
      minLng: minLng - lngSpan * 0.1,
      maxLng: maxLng + lngSpan * 0.1
    };
  }, [routes, depot]);

  // Coordinate projection from (lat, lng) to SVG (x, y)
  // SVG Canvas dimensions: 1000 x 600
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 600;

  const project = (lat: number, lng: number) => {
    const latRatio = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
    const lngRatio = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);

    // In SVG, y increases downwards, whereas latitude increases upwards
    const x = lngRatio * SVG_WIDTH;
    const y = (1 - latRatio) * SVG_HEIGHT;
    return { x, y };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Map Control Bar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">{d.mapTitle}</h3>
        </div>

        {/* Driver Filter Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
          >
            إظهار الكل
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
          >
            إخفاء الكل
          </button>

          {routes.map(r => {
            const color = driverColors.get(r.driverId) || '#2563eb';
            const isVisible = visibleDrivers[r.driverId] !== false;
            return (
              <button
                key={r.driverId}
                type="button"
                onClick={() => toggleDriverVisibility(r.driverId)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition border ${
                  isVisible
                    ? 'bg-white text-slate-800 border-slate-300 shadow-xs'
                    : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{r.driverId}</span>
                {isVisible ? <Eye className="h-3 w-3 ml-0.5 text-slate-500" /> : <EyeOff className="h-3 w-3 ml-0.5 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative w-full aspect-[16/9] max-h-[550px] bg-slate-900 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render Route Paths */}
          {routes.map(route => {
            if (visibleDrivers[route.driverId] === false) return null;
            if (route.orderedStops.length === 0) return null;

            const color = driverColors.get(route.driverId) || '#3b82f6';
            const isDriverSelected = selectedDriverId === route.driverId;

            // Generate path string from depot -> stops -> depot
            const depotCoord = depot ? project(depot.latitude, depot.longitude) : { x: 500, y: 300 };
            const stopCoords = route.orderedStops.map(s => project(s.latitude, s.longitude));

            let pathD = `M ${depotCoord.x} ${depotCoord.y}`;
            stopCoords.forEach(c => {
              pathD += ` L ${c.x} ${c.y}`;
            });
            pathD += ` L ${depotCoord.x} ${depotCoord.y}`;

            return (
              <g key={`path-${route.driverId}`}>
                {/* Glow backdrop for selected route */}
                {isDriverSelected && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Primary Route Polyline */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isDriverSelected ? '3.5' : '2.2'}
                  strokeDasharray={route.routingStatus === 'ROUTING_UNAVAILABLE' ? '4,4' : 'none'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Render Delivery Stop Markers */}
          {routes.map(route => {
            if (visibleDrivers[route.driverId] === false) return null;
            const color = driverColors.get(route.driverId) || '#3b82f6';

            return route.orderedStops.map((stop, index) => {
              const { x, y } = project(stop.latitude, stop.longitude);
              const isHovered = activeStop?.stop.stopId === stop.stopId;

              return (
                <g
                  key={`marker-${stop.stopId}`}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer transition-transform duration-150 hover:scale-125"
                  onClick={() => setActiveStop({ stop, driverId: route.driverId, seq: index + 1 })}
                >
                  <circle
                    r={isHovered ? '13' : '10'}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="shadow-md"
                  />
                  <text
                    textAnchor="middle"
                    dy="3.5"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            });
          })}

          {/* Central Depot Hub Waypoint */}
          {depot && (() => {
            const { x, y } = project(depot.latitude, depot.longitude);
            return (
              <g transform={`translate(${x}, ${y})`} className="cursor-pointer">
                <circle r="16" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                <polygon
                  points="0,-8 7,5 -7,5"
                  fill="#60a5fa"
                />
                <text
                  textAnchor="middle"
                  dy="24"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  stroke="#0f172a"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {depot.name}
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Selected Stop Details Popover Box */}
        {activeStop && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-slate-200 text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                    #{activeStop.seq}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {activeStop.stop.buyerName}
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  {activeStop.stop.buyerCode}
                </div>
              </div>
              <button
                onClick={() => setActiveStop(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>السائق:</span>
                <strong className="text-blue-600">{activeStop.driverId}</strong>
              </div>
              <div className="flex justify-between">
                <span>الحمولة الكلية:</span>
                <strong className="text-emerald-700">{activeStop.stop.totalWeightKg} {messages.common.kg}</strong>
              </div>
              <div className="flex justify-between">
                <span>القوائم المدمجة ({activeStop.stop.lists.length}):</span>
                <span className="font-mono text-slate-500">
                  {activeStop.stop.lists.map(l => l.listNumber).join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>الإحداثيات:</span>
                <span>{activeStop.stop.latitude.toFixed(4)}, {activeStop.stop.longitude.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
