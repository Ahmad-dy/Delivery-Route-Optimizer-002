import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Route as RouteIcon,
  Sparkles,
  ClipboardCheck,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Truck,
  Layers,
  History
} from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useDistributionStore } from '../../state/distributionStore';
import { useOperationStore } from '../../state/operationStore';
import { useDriverStore } from '../../state/driverStore';
import { useSettingsStore } from '../../state/settingsStore';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';
import { ApprovedDistribution } from '../../core/domain/entities/ApprovedDistribution';
import { DistributionResult } from '../../core/domain/entities/DistributionResult';
import { OptimizationConfig } from '../../core/domain/value-objects/OptimizationConfig';

import { DistributionHeader } from '../components/distribution/DistributionHeader';
import { DriverRouteCard } from '../components/distribution/DriverRouteCard';
import { RouteStopList } from '../components/distribution/RouteStopList';
import { ManualReassignModal } from '../components/distribution/ManualReassignModal';
import { UnassignedStopsPanel } from '../components/distribution/UnassignedStopsPanel';
import { DistributionWarningsList } from '../components/distribution/DistributionWarningsList';
import { ApprovalConfirmationModal } from '../components/distribution/ApprovalConfirmationModal';
import { ApprovedHistoryModal } from '../components/distribution/ApprovedHistoryModal';
import { FullRouteMapView } from '../components/distribution/FullRouteMapView';

interface DistributionViewProps {
  messages: Messages;
  onNavigateToOptimization: () => void;
  onNavigateToImport: () => void;
  onNavigateToRouting: () => void;
}

const DRIVER_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Amber
  '#9333ea', // Purple
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#be185d', // Pink
  '#ea580c', // Orange
  '#059669'  // Emerald
];

export const DistributionView: React.FC<DistributionViewProps> = ({
  messages,
  onNavigateToOptimization,
  onNavigateToImport,
  onNavigateToRouting
}) => {
  const d = messages.distribution;

  // Distribution Store (Stage 6)
  const {
    routes,
    unassignedStops,
    oversizedStops,
    activeDrivers,
    depot,
    status,
    progress,
    errorMessage,
    warnings,
    validation,
    scoreBreakdown,
    approvedDistribution,
    historyStack,
    lastMutationNotice,
    initializeFromOptimizationResult,
    manualReassignStop,
    manualReorderStops,
    calculateFinalRoutes,
    approveDistribution,
    undo,
    clearMutationNotice
  } = useDistributionStore();

  // Operation Store (Stage 5 / Prior Data)
  const {
    distributionResult
  } = useOperationStore();

  const { drivers } = useDriverStore();
  const { settings } = useSettingsStore();

  // UI State: modals and view toggles
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [reassignStopTarget, setReassignStopTarget] = useState<DeliveryStop | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedDriverIds, setExpandedDriverIds] = useState<Record<string, boolean>>({});
  const [showMap, setShowMap] = useState(true);

  // Auto-initialize session if distributionResult exists and session not initialized
  useEffect(() => {
    if (routes.length === 0 && distributionResult && distributionResult.routes.length > 0) {
      const activeFleet = drivers.filter(drv => drv.active);

      initializeFromOptimizationResult({
        result: distributionResult,
        activeDrivers: activeFleet,
        depot: settings.depot,
        referenceDistanceMeters: distributionResult.totalDistanceMeters,
        config: OptimizationConfig.default()
      });
    }
  }, [
    distributionResult,
    drivers,
    settings.depot,
    routes.length,
    initializeFromOptimizationResult
  ]);

  // Expand first driver by default
  useEffect(() => {
    if (routes.length > 0 && Object.keys(expandedDriverIds).length === 0) {
      setExpandedDriverIds({ [routes[0].driverId]: true });
    }
  }, [routes, expandedDriverIds]);

  // Map drivers to consistent colors
  const driverColors = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach((route, idx) => {
      map.set(route.driverId, DRIVER_COLORS[idx % DRIVER_COLORS.length]);
    });
    return map;
  }, [routes]);

  // Build unassigned reasons map
  const unassignedReasons = useMemo(() => {
    const map = new Map<string, string>();
    unassignedStops.forEach(s => {
      if (oversizedStops.some(o => o.stopId === s.stopId)) {
        map.set(s.stopId, 'OVERSIZED_LIST');
      } else {
        map.set(s.stopId, 'NO_CAPACITY_FIT');
      }
    });
    return map;
  }, [unassignedStops, oversizedStops]);

  // Aggregated totals
  const totals = useMemo(() => {
    let weight = 0;
    let distance = 0;
    let duration = 0;
    let stops = 0;
    let lists = 0;

    routes.forEach(r => {
      weight += r.totalWeightKg;
      distance += r.totalDistanceMeters;
      duration += r.totalDurationSeconds;
      stops += r.stopCount;
      lists += r.listCount;
    });

    return {
      weight: Math.round(weight * 100) / 100,
      distance,
      duration,
      stops,
      lists
    };
  }, [routes]);

  // Selected route for stop sequence view
  const currentSelectedDriverId = selectedDriverId ?? routes[0]?.driverId ?? null;
  const currentRoute = routes.find(r => r.driverId === currentSelectedDriverId);

  // Toggle card expansion
  const handleToggleExpand = (driverId: string) => {
    setExpandedDriverIds(prev => ({ ...prev, [driverId]: !prev[driverId] }));
  };

  // Reassignment submit
  const handleConfirmReassign = async (targetDriverId: string | null) => {
    if (!reassignStopTarget) return;
    await manualReassignStop(reassignStopTarget.stopId, targetDriverId ?? 'UNASSIGNED');
  };

  // Reorder stops in selected route
  const handleReorderStops = async (newOrderedStopIds: readonly string[]) => {
    if (!currentRoute) return;
    await manualReorderStops(currentRoute.driverId, newOrderedStopIds);
  };

  // Final approval
  const handleConfirmApproval = async (approvedBy: string) => {
    await approveDistribution(approvedBy);
  };

  // Restore snapshot from history modal
  const handleRestoreSnapshot = (snapshot: ApprovedDistribution) => {
    const activeFleet = drivers.filter(drv => drv.active);
    const distResult = DistributionResult.create({
      routes: snapshot.routes.map(r => r.toJSON()),
      unassignedStops: snapshot.unassigned.map(u => u.toJSON()),
      oversizedStops: [],
      warnings: [...snapshot.warnings],
      totalDistanceMeters: snapshot.metrics.finalDistanceMeters,
      totalDurationSeconds: snapshot.metrics.totalDurationSeconds,
      totalWeightKg: snapshot.routes.reduce((sum, r) => sum + r.totalWeightKg, 0),
      driversUsed: snapshot.routes.length,
      metrics: snapshot.metrics,
      generatedAt: snapshot.approvedAt
    });

    initializeFromOptimizationResult({
      result: distResult,
      activeDrivers: activeFleet,
      depot: snapshot.depot,
      referenceDistanceMeters: snapshot.metrics.finalDistanceMeters,
      config: OptimizationConfig.default()
    });
    setShowHistoryModal(false);
  };

  // Empty state: no active routes or optimization run yet
  if (routes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 shadow-sm">
          <ClipboardCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{d.title}</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
          لا توجد جلسة توزيع جارية في الذاكرة. يرجى تشغيل محرك تحسين المسارات (Stage 5) أولاً، أو تصفح سجل التوزيعات المعتمدة المحفوظة.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNavigateToOptimization}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>تشغيل تحسين المسارات (Stage 5)</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition"
          >
            <History className="h-4 w-4" />
            <span>عرض التوزيعات المعتمدة السابقة</span>
          </button>
        </div>

        {/* Show History Modal if opened from empty state */}
        {showHistoryModal && (
          <ApprovedHistoryModal
            messages={messages}
            onClose={() => setShowHistoryModal(false)}
            onRestoreSnapshot={handleRestoreSnapshot}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* 1. Header Bar with Global Metrics & Top Actions */}
      <DistributionHeader
        messages={messages}
        status={status}
        progress={progress}
        driversCount={routes.length}
        stopsCount={totals.stops}
        listsCount={totals.lists}
        totalWeightKg={totals.weight}
        totalDistanceMeters={totals.distance}
        totalDurationSeconds={totals.duration}
        scoreBreakdown={scoreBreakdown}
        validation={validation}
        warnings={warnings}
        historyCount={historyStack.length}
        revision={approvedDistribution?.revision ?? 1}
        onRecalculate={calculateFinalRoutes}
        onUndo={undo}
        onOpenApproveModal={() => setShowApprovalModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      {/* 2. Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Mutation Score Impact Notification Toast */}
        {lastMutationNotice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all shadow-sm ${
              lastMutationNotice.isDegraded
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {lastMutationNotice.isDegraded ? (
                <TrendingDown className="h-4 w-4 text-amber-600 flex-shrink-0" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              )}
              <span>
                <strong>{lastMutationNotice.title}</strong>: {lastMutationNotice.message}
              </span>
            </div>
            <button
              onClick={clearMutationNotice}
              className="text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
            <AlertOctagon className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Domain Warnings & Invariant List */}
        <DistributionWarningsList
          warnings={warnings}
          validation={validation}
          messages={messages}
        />

        {/* Unassigned Stops Pool (if any) */}
        {unassignedStops.length > 0 && (
          <UnassignedStopsPanel
            unassignedStops={unassignedStops}
            reasons={unassignedReasons}
            messages={messages}
            onAssignStop={(stop) => setReassignStopTarget(stop)}
          />
        )}

        {/* Interactive Fleet Map View */}
        {showMap && (
          <FullRouteMapView
            routes={routes}
            depot={depot}
            driverColors={driverColors}
            selectedDriverId={currentSelectedDriverId}
            messages={messages}
          />
        )}

        {/* 3. Driver Routes & Stop Details 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Driver Route Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>أسطول السائقين الموزع عليهم ({routes.length})</span>
              </h3>
              <span className="text-xs text-slate-400">
                اختر سائقاً لعرض مساره
              </span>
            </div>

            {routes.map((route) => {
              const driver = activeDrivers.find(d => d.driverId === route.driverId);
              const color = driverColors.get(route.driverId) || '#2563eb';
              const isSelected = route.driverId === currentSelectedDriverId;
              const isExpanded = expandedDriverIds[route.driverId] ?? false;

              return (
                <DriverRouteCard
                  key={route.driverId}
                  route={route}
                  driver={driver}
                  color={color}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  messages={messages}
                  onToggleExpand={() => handleToggleExpand(route.driverId)}
                  onSelect={() => setSelectedDriverId(route.driverId)}
                  onFocusOnMap={() => {
                    setSelectedDriverId(route.driverId);
                    setShowMap(true);
                  }}
                />
              );
            })}
          </div>

          {/* Right Column: Selected Route Stop Sequence Details (7 cols) */}
          <div className="lg:col-span-7">
            {currentRoute ? (
              <RouteStopList
                route={currentRoute}
                depot={depot}
                messages={messages}
                onMoveStop={(stop) => setReassignStopTarget(stop)}
                onReorder={handleReorderStops}
              />
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                يرجى اختيار سائق من القائمة لعرض تسلسل محطاته وتعديلها.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modals */}
      {/* Manual Reassignment Modal */}
      {reassignStopTarget && (
        <ManualReassignModal
          stop={reassignStopTarget}
          currentRoute={routes.find(r =>
            r.orderedStops.some(s => s.stopId === reassignStopTarget.stopId)
          )}
          allRoutes={routes}
          activeDrivers={activeDrivers}
          messages={messages}
          onConfirm={handleConfirmReassign}
          onClose={() => setReassignStopTarget(null)}
        />
      )}

      {/* Approval Confirmation Dialog */}
      {showApprovalModal && (
        <ApprovalConfirmationModal
          driversCount={routes.length}
          stopsCount={totals.stops}
          listsCount={totals.lists}
          totalWeightKg={totals.weight}
          totalDistanceMeters={totals.distance}
          totalDurationSeconds={totals.duration}
          unassignedCount={unassignedStops.length}
          messages={messages}
          onConfirm={handleConfirmApproval}
          onClose={() => setShowApprovalModal(false)}
        />
      )}

      {/* Approved Distributions History Modal */}
      {showHistoryModal && (
        <ApprovedHistoryModal
          messages={messages}
          onClose={() => setShowHistoryModal(false)}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      )}
    </div>
  );
};
