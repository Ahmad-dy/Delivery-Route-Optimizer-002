import React, { useState } from 'react';
import {
  Route,
  Navigation,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  Database,
  Layers,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useOperationStore } from '../../state/operationStore';
import { useSettingsStore } from '../../state/settingsStore';
import { RouteMatrix, RoutingMatrixElement } from '../../core/application/ports/IRoutingService';

interface RoutingViewProps {
  messages: Messages;
  onNavigateToImport: () => void;
}

export const RoutingView: React.FC<RoutingViewProps> = ({ messages, onNavigateToImport }) => {
  const {
    confirmedSession,
    deliveryStops,
    routingStatus,
    routeMatrix,
    routingProgress,
    routingDiagnostics,
    routingErrorMessage,
    computeRouteMatrix,
    resetRouting
  } = useOperationStore();

  const { settings } = useSettingsStore();

  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'pairs' | 'map'>('matrix');
  const [selectedPair, setSelectedPair] = useState<RoutingMatrixElement | null>(null);
  const [filterSearch, setFilterSearch] = useState('');

  const depot = settings.depot;
  const hasConfirmedSession = Boolean(confirmedSession && deliveryStops.length > 0);
  const isCalculating = routingStatus === 'PREPARING' || routingStatus === 'ROUTING';

  const totalLocations = deliveryStops.length + 1; // Depot + Stops
  const totalMatrixElements = totalLocations * totalLocations;

  const handleCompute = async () => {
    try {
      await computeRouteMatrix();
    } catch {
      // Handled in store
    }
  };

  // Helper to format distance in km or meters
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Helper to format duration in minutes or seconds
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Extract all matrix elements as flat list for pairwise tab
  const flatElements: RoutingMatrixElement[] = React.useMemo(() => {
    if (!routeMatrix) return [];
    const list: RoutingMatrixElement[] = [];
    for (const row of routeMatrix.elements) {
      for (const el of row) {
        list.push(el);
      }
    }
    return list;
  }, [routeMatrix]);

  const filteredFlatElements = React.useMemo(() => {
    if (!filterSearch.trim()) return flatElements;
    const q = filterSearch.toLowerCase();
    return flatElements.filter(
      el => el.originId.toLowerCase().includes(q) || el.destinationId.toLowerCase().includes(q)
    );
  }, [flatElements, filterSearch]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Route className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {messages.routing.title}
              </h2>
            </div>
            <p className="text-sm text-slate-500 max-w-3xl">
              {messages.routing.subtitle}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Navigation className="h-3.5 w-3.5" />
              {messages.routing.modeDrive}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {messages.routing.realRoadNetwork}
            </span>
          </div>
        </div>

        {/* No Haversine Warning Note */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{messages.routing.noHaversineNote}</span>
        </div>
      </div>

      {/* Main Content Area */}
      {!hasConfirmedSession ? (
        // Empty State: No Session
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              {messages.routing.noConfirmedSession}
            </h3>
            <p className="text-xs text-slate-500">
              {messages.routing.noConfirmedSessionSub}
            </p>
          </div>
          <div>
            <button
              id="goto-import-btn"
              onClick={onNavigateToImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition shadow-blue-600/30"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{messages.routing.importFirstButton}</span>
            </button>
          </div>
        </div>
      ) : (
        // Confirmed Session Available
        <div className="space-y-6">
          {/* Status & Control Panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Depot Status Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    {messages.routing.depotHub}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    DEPOT
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {depot.name || 'Central Warehouse'}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {depot.latitude.toFixed(4)}, {depot.longitude.toFixed(4)}
                </div>
              </div>

              {/* Delivery Stops Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {messages.routing.stopsCount}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    VERIFIED
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {deliveryStops.length} <span className="text-xs font-normal text-slate-500">stops</span>
                </div>
                <div className="text-xs text-slate-500">
                  {confirmedSession?.summary.validLists} lists aggregated
                </div>
              </div>

              {/* Matrix Dimensions Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-purple-600" />
                    {messages.routing.totalConnections}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    {totalLocations} × {totalLocations}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {totalMatrixElements} <span className="text-xs font-normal text-slate-500">matrix cells</span>
                </div>
                <div className="text-xs text-slate-500">
                  Full pairwise directional road metrics
                </div>
              </div>

              {/* Action Button Card */}
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">
                    {messages.common.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      routingStatus === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : routingStatus === 'ROUTING' || routingStatus === 'PREPARING'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : routingStatus === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {routingStatus}
                  </span>
                </div>
                <div>
                  <button
                    id="compute-matrix-btn"
                    onClick={handleCompute}
                    disabled={isCalculating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition shadow-blue-600/30 cursor-pointer"
                  >
                    {isCalculating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{messages.routing.calculating}</span>
                      </>
                    ) : (
                      <>
                        <Route className="h-4 w-4" />
                        <span>
                          {routeMatrix ? messages.routing.recalculate : messages.routing.calculateMatrix}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Progress Bar when calculating */}
            {isCalculating && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    <span>{messages.routing.calculatingSubtitle}</span>
                  </div>
                  <span>{routingProgress.percentage}%</span>
                </div>
                <div className="w-full bg-blue-200/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${routingProgress.percentage}%` }}
                  />
                </div>
                <div className="text-[11px] text-blue-700 font-medium text-center">
                  {messages.routing.progressText
                    .replace('{processed}', String(routingProgress.processedElements))
                    .replace('{total}', String(routingProgress.totalElements))}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {routingErrorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-900 animate-fadeIn">
                <AlertOctagon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">{messages.routing.failedNotice}</div>
                  <div>{routingErrorMessage}</div>
                </div>
              </div>
            )}

            {/* Success Notice */}
            {routingStatus === 'COMPLETED' && !routingErrorMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 animate-fadeIn">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{messages.routing.successNotice}</span>
              </div>
            )}
          </div>

          {/* Observability & Diagnostics Section */}
          {routingDiagnostics && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>{messages.routing.diagnosticsTitle}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">{messages.routing.requestCount}</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {routingDiagnostics.requestCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">{messages.routing.cacheHits}</div>
                  <div className="text-base font-bold text-emerald-600 font-mono">
                    {routingDiagnostics.cacheHits}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">{messages.routing.cacheMisses}</div>
                  <div className="text-base font-bold text-blue-600 font-mono">
                    {routingDiagnostics.cacheMisses}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">{messages.routing.retryCount}</div>
                  <div className="text-base font-bold text-amber-600 font-mono">
                    {routingDiagnostics.retryCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">{messages.routing.routingDuration}</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {routingDiagnostics.routingDurationMs} ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Matrix & Visualization Views */}
          {routeMatrix && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
              {/* Sub-tab Navigation */}
              <div className="flex border-b border-slate-200 px-6 pt-4 gap-4 bg-slate-50/70">
                <button
                  id="tab-matrix-view"
                  onClick={() => setActiveSubTab('matrix')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
                    activeSubTab === 'matrix'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>{messages.routing.matrixView}</span>
                </button>
                <button
                  id="tab-pairs-view"
                  onClick={() => setActiveSubTab('pairs')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
                    activeSubTab === 'pairs'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Route className="h-4 w-4" />
                  <span>Pairwise Connections ({flatElements.length})</span>
                </button>
                <button
                  id="tab-map-view"
                  onClick={() => setActiveSubTab('map')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
                    activeSubTab === 'map'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>{messages.routing.mapPreviewTitle}</span>
                </button>
              </div>

              {/* Sub-tab 1: Matrix Grid */}
              {activeSubTab === 'matrix' && (
                <div className="p-6 overflow-x-auto">
                  <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                    <span>Rows = Origin | Columns = Destination. Values = Driving Distance / Driving Duration.</span>
                    <span className="font-mono text-slate-400">Total: {totalLocations} × {totalLocations}</span>
                  </div>
                  <table className="w-full text-xs text-left rtl:text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700">
                        <th className="p-2.5 border border-slate-200 font-bold bg-slate-200/60 sticky left-0 z-10">
                          From \ To
                        </th>
                        {routeMatrix.destinations.map((dest, colIdx) => (
                          <th
                            key={dest.id}
                            className="p-2.5 border border-slate-200 font-bold text-center min-w-[110px]"
                            title={`${dest.id} - ${dest.name || ''}`}
                          >
                            <div className="truncate max-w-[100px]">{dest.id}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {routeMatrix.elements.map((row, rowIdx) => {
                        const origin = routeMatrix.origins[rowIdx];
                        return (
                          <tr key={origin.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 border border-slate-200 font-bold bg-slate-100/60 sticky left-0 z-10 text-slate-800">
                              <div className="truncate max-w-[120px]" title={`${origin.id} - ${origin.name || ''}`}>
                                {origin.id}
                              </div>
                            </td>
                            {row.map((cell, colIdx) => {
                              const isSelf = rowIdx === colIdx;
                              return (
                                <td
                                  key={`${cell.originId}->${cell.destinationId}`}
                                  onClick={() => setSelectedPair(cell)}
                                  className={`p-2 border border-slate-200 text-center cursor-pointer transition ${
                                    isSelf
                                      ? 'bg-slate-50 text-slate-400'
                                      : cell.status === 'OK'
                                      ? 'hover:bg-blue-50 text-slate-900'
                                      : 'bg-red-50 text-red-600'
                                  }`}
                                >
                                  {isSelf ? (
                                    <span className="text-slate-300 font-mono">—</span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <div className="font-bold font-mono">
                                        {formatDistance(cell.distanceMeters)}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        {formatDuration(cell.durationSeconds)}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab 2: Pairwise List */}
              {activeSubTab === 'pairs' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="text"
                      placeholder="Filter by Location ID..."
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      className="px-3.5 py-2 rounded-xl text-xs border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                    />
                    <div className="text-xs text-slate-500 font-medium">
                      Showing {filteredFlatElements.length} of {flatElements.length} connections
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">{messages.routing.origin}</th>
                          <th className="p-3">{messages.routing.destination}</th>
                          <th className="p-3">{messages.routing.distance}</th>
                          <th className="p-3">{messages.routing.duration}</th>
                          <th className="p-3">{messages.routing.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredFlatElements.slice(0, 50).map((el, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-800">
                              {el.originId}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800">
                              {el.destinationId}
                            </td>
                            <td className="p-3 font-mono text-slate-700">
                              {formatDistance(el.distanceMeters)}
                            </td>
                            <td className="p-3 font-mono text-slate-700">
                              {formatDuration(el.durationSeconds)}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  el.status === 'OK'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {el.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Geographic Map Preview (Verification only - NO driver assignment) */}
              {activeSubTab === 'map' && (
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>{messages.routing.mapPreviewSubtitle}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Depot (1) + Delivery Stops ({deliveryStops.length})
                    </span>
                  </div>

                  {/* SVG / Canvas spatial plot */}
                  <div className="relative w-full h-96 bg-slate-900 rounded-xl border border-slate-800 p-6 overflow-hidden flex items-center justify-center">
                    {/* Spatial Plot Canvas */}
                    <SpatialLocationPlot depot={depot} stops={deliveryStops} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SpatialLocationPlotProps {
  depot: { latitude: number; longitude: number; name: string };
  stops: readonly { stopId: string; buyerName: string; latitude: number; longitude: number }[];
}

const SpatialLocationPlot: React.FC<SpatialLocationPlotProps> = ({ depot, stops }) => {
  const allPoints = [{ lat: depot.latitude, lng: depot.longitude, isDepot: true, name: 'DEPOT' }, ...stops.map(s => ({ lat: s.latitude, lng: s.longitude, isDepot: false, name: s.stopId }))];

  const minLat = Math.min(...allPoints.map(p => p.lat));
  const maxLat = Math.max(...allPoints.map(p => p.lat));
  const minLng = Math.min(...allPoints.map(p => p.lng));
  const maxLng = Math.max(...allPoints.map(p => p.lng));

  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);

  return (
    <svg className="w-full h-full" viewBox="0 0 600 350" preserveAspectRatio="xMidYMid meet">
      {/* Grid Lines */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Connection Lines from Depot for verification */}
      {stops.map(s => {
        const x1 = 40 + ((depot.longitude - minLng) / lngSpan) * 520;
        const y1 = 310 - ((depot.latitude - minLat) / latSpan) * 270;
        const x2 = 40 + ((s.longitude - minLng) / lngSpan) * 520;
        const y2 = 310 - ((s.latitude - minLat) / latSpan) * 270;
        return (
          <line
            key={s.stopId}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Delivery Stops Markers */}
      {stops.map(s => {
        const x = 40 + ((s.longitude - minLng) / lngSpan) * 520;
        const y = 310 - ((s.latitude - minLat) / latSpan) * 270;
        return (
          <g key={s.stopId} className="cursor-pointer group">
            <circle cx={x} cy={y} r="6" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
            <text
              x={x}
              y={y - 10}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="middle"
              className="font-mono select-none pointer-events-none"
            >
              {s.stopId}
            </text>
          </g>
        );
      })}

      {/* Central Depot Marker */}
      {(() => {
        const dx = 40 + ((depot.longitude - minLng) / lngSpan) * 520;
        const dy = 310 - ((depot.latitude - minLat) / latSpan) * 270;
        return (
          <g className="cursor-pointer">
            <circle cx={dx} cy={dy} r="9" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
            <text
              x={dx}
              y={dy - 13}
              fill="#f87171"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono select-none pointer-events-none"
            >
              ★ DEPOT HUB
            </text>
          </g>
        );
      })()}
    </svg>
  );
};
