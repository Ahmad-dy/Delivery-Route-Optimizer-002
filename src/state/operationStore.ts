import { create } from 'zustand';
import { container } from '../core/application/di/container';
import { DeliveryList } from '../core/domain/entities/DeliveryList';
import { DeliveryStop } from '../core/domain/entities/DeliveryStop';
import { Driver } from '../core/domain/entities/Driver';
import { DistributionResult } from '../core/domain/entities/DistributionResult';
import { RouteMatrix, RoutingDiagnostics } from '../core/application/ports/IRoutingService';
import { useSettingsStore } from './settingsStore';
import { useDriverStore } from './driverStore';
import {
  ExcelImportResult,
  ImportRowWarning,
  ImportSummary,
  AggregatedDeliveryStop
} from '../core/application/use-cases/import/ImportDeliveryExcelUseCase';

export type OperationSessionStatus =
  | 'IDLE'
  | 'PARSING'
  | 'VALIDATING'
  | 'READY'
  | 'BLOCKING_ERRORS'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED';

export type RoutingSessionStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'ROUTING'
  | 'COMPLETED'
  | 'PARTIAL_FAILURE'
  | 'FAILED';

export type OptimizationStatus =
  | 'IDLE'
  | 'OPTIMIZING'
  | 'COMPLETED'
  | 'FAILED';

export interface RoutingProgressInfo {
  readonly processedElements: number;
  readonly totalElements: number;
  readonly percentage: number;
  readonly stage: string;
}

export interface ConfirmedSession {
  readonly fileName: string;
  readonly confirmedAt: Date;
  readonly lists: readonly DeliveryList[];
  readonly stops: readonly AggregatedDeliveryStop[];
  readonly summary: ImportSummary;
  readonly warnings: readonly ImportRowWarning[];
}

interface OperationState {
  // Temporary Import State (Stage 3)
  currentImportResult: ExcelImportResult | null;
  status: OperationSessionStatus;
  isProcessing: boolean;
  errorMessage: string | null;

  // Active Confirmed In-Memory Session
  confirmedSession: ConfirmedSession | null;

  // Routing Session State (Stage 4)
  routingStatus: RoutingSessionStatus;
  routeMatrix: RouteMatrix | null;
  routingProgress: RoutingProgressInfo;
  routingDiagnostics: RoutingDiagnostics | null;
  routingErrorMessage: string | null;

  // Domain data
  rawDeliveryLists: readonly DeliveryList[];
  deliveryStops: readonly DeliveryStop[];
  participatingDrivers: readonly Driver[];
  distributionResult: DistributionResult | null;
  selectedDriverRouteId: string | null;

  // Import Actions
  importExcelFile: (fileBuffer: ArrayBuffer, fileName: string, fileSize: number) => Promise<ExcelImportResult>;
  confirmImport: () => boolean;
  cancelImport: () => void;
  clearConfirmedSession: () => void;
  resetSession: () => void;

  // Routing Actions (Stage 4)
  computeRouteMatrix: () => Promise<RouteMatrix | null>;
  resetRouting: () => void;

  // Optimization Actions (Stage 5)
  optimizationStatus: OptimizationStatus;
  optimizationErrorMessage: string | null;
  runOptimization: () => Promise<DistributionResult | null>;
  reassignStop: (stopId: string, targetDriverId: string | 'UNASSIGNED') => void;
  selectDriverRoute: (driverId: string | null) => void;
  resetOptimization: () => void;
}

export const useOperationStore = create<OperationState>((set, get) => ({
  currentImportResult: null,
  status: 'IDLE',
  isProcessing: false,
  errorMessage: null,
  confirmedSession: null,

  routingStatus: 'IDLE',
  routeMatrix: null,
  routingProgress: {
    processedElements: 0,
    totalElements: 0,
    percentage: 0,
    stage: 'idle'
  },
  routingDiagnostics: null,
  routingErrorMessage: null,

  optimizationStatus: 'IDLE',
  optimizationErrorMessage: null,

  rawDeliveryLists: [],
  deliveryStops: [],
  participatingDrivers: [],
  distributionResult: null,
  selectedDriverRouteId: null,

  importExcelFile: async (fileBuffer: ArrayBuffer, fileName: string, fileSize: number) => {
    set({ isProcessing: true, status: 'PARSING', errorMessage: null });

    try {
      set({ status: 'VALIDATING' });
      const result = await container.importDeliveryExcelUseCase.execute(fileBuffer, fileName, fileSize);

      set({
        currentImportResult: result,
        status: result.status === 'READY' ? 'READY' : result.status === 'BLOCKING_ERRORS' ? 'BLOCKING_ERRORS' : 'FAILED',
        isProcessing: false,
        errorMessage: result.errors.length > 0 ? result.errors[0].message : null
      });

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        isProcessing: false,
        status: 'FAILED',
        errorMessage: msg
      });
      throw err;
    }
  },

  confirmImport: () => {
    const { currentImportResult, status } = get();

    if (!currentImportResult || status !== 'READY' || currentImportResult.errors.length > 0) {
      return false;
    }

    // Convert AggregatedDeliveryStop to domain DeliveryStop
    const domainStops: DeliveryStop[] = currentImportResult.stops.map(s => {
      return new DeliveryStop(
        s.stopId,
        s.buyerCode,
        s.buyerName,
        s.latitude,
        s.longitude,
        s.lists
      );
    });

    const confirmed: ConfirmedSession = {
      fileName: currentImportResult.fileName,
      confirmedAt: new Date(),
      lists: currentImportResult.lists,
      stops: currentImportResult.stops,
      summary: currentImportResult.summary,
      warnings: currentImportResult.warnings
    };

    set({
      status: 'CONFIRMED',
      confirmedSession: confirmed,
      rawDeliveryLists: currentImportResult.lists,
      deliveryStops: Object.freeze(domainStops),
      routingStatus: 'IDLE',
      routeMatrix: null,
      routingErrorMessage: null,
      errorMessage: null
    });

    return true;
  },

  cancelImport: () => {
    set({
      currentImportResult: null,
      status: 'CANCELLED',
      isProcessing: false,
      errorMessage: null
    });
  },

  clearConfirmedSession: () => {
    set({
      confirmedSession: null,
      currentImportResult: null,
      status: 'IDLE',
      routingStatus: 'IDLE',
      routeMatrix: null,
      routingErrorMessage: null,
      rawDeliveryLists: [],
      deliveryStops: [],
      participatingDrivers: [],
      distributionResult: null,
      selectedDriverRouteId: null,
      errorMessage: null
    });
  },

  computeRouteMatrix: async () => {
    const { deliveryStops, confirmedSession } = get();
    const settings = useSettingsStore.getState().settings;

    if (!confirmedSession || deliveryStops.length === 0) {
      set({
        routingStatus: 'FAILED',
        routingErrorMessage: 'No confirmed delivery stops found. Please import an Excel file first.'
      });
      return null;
    }

    const totalLocations = deliveryStops.length + 1; // Depot + Stops
    const totalElements = totalLocations * totalLocations;

    set({
      routingStatus: 'PREPARING',
      routingErrorMessage: null,
      routingProgress: {
        processedElements: 0,
        totalElements,
        percentage: 10,
        stage: 'validating_coordinates'
      }
    });

    try {
      set({
        routingStatus: 'ROUTING',
        routingProgress: {
          processedElements: Math.round(totalElements * 0.3),
          totalElements,
          percentage: 40,
          stage: 'computing_road_matrix'
        }
      });

      const output = await container.generateRouteMatrixUseCase.execute({
        depot: settings.depot,
        stops: deliveryStops
      });

      const diagnostics = container.routingService.getDiagnostics();

      // Verify if any element failed
      let hasFailures = false;
      for (const row of output.matrix.elements) {
        for (const el of row) {
          if (el.status !== 'OK') {
            hasFailures = true;
            break;
          }
        }
        if (hasFailures) break;
      }

      set({
        routeMatrix: output.matrix,
        routingDiagnostics: diagnostics,
        routingStatus: hasFailures ? 'PARTIAL_FAILURE' : 'COMPLETED',
        routingProgress: {
          processedElements: totalElements,
          totalElements,
          percentage: 100,
          stage: 'completed'
        },
        routingErrorMessage: null
      });

      return output.matrix;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const diagnostics = container.routingService.getDiagnostics();

      set({
        routingStatus: 'FAILED',
        routingErrorMessage: errorMsg,
        routingDiagnostics: diagnostics,
        routingProgress: {
          processedElements: 0,
          totalElements,
          percentage: 0,
          stage: 'failed'
        }
      });
      throw err;
    }
  },

  resetRouting: () => {
    set({
      routingStatus: 'IDLE',
      routeMatrix: null,
      routingErrorMessage: null,
      routingProgress: {
        processedElements: 0,
        totalElements: 0,
        percentage: 0,
        stage: 'idle'
      }
    });
  },

  runOptimization: async () => {
    const { deliveryStops, routeMatrix, confirmedSession } = get();
    const settings = useSettingsStore.getState().settings;
    const drivers = useDriverStore.getState().drivers;

    if (!confirmedSession || deliveryStops.length === 0) {
      set({
        optimizationStatus: 'FAILED',
        optimizationErrorMessage: 'No confirmed delivery stops found. Please import an Excel file first.'
      });
      return null;
    }

    set({
      optimizationStatus: 'OPTIMIZING',
      optimizationErrorMessage: null
    });

    try {
      const activeDrivers = drivers.filter(d => d.active);

      const result = await container.optimizeDistributionUseCase.execute({
        depot: settings.depot,
        stops: deliveryStops,
        drivers: activeDrivers,
        config: settings.optimizationConfig
      });

      set({
        distributionResult: result,
        participatingDrivers: activeDrivers,
        optimizationStatus: 'COMPLETED',
        optimizationErrorMessage: null,
        selectedDriverRouteId: result.routes.length > 0 ? result.routes[0].driverId : null
      });

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        optimizationStatus: 'FAILED',
        optimizationErrorMessage: msg
      });
      throw err;
    }
  },

  reassignStop: (stopId: string, targetDriverId: string | 'UNASSIGNED') => {
    const { distributionResult, routeMatrix } = get();
    const settings = useSettingsStore.getState().settings;
    const drivers = useDriverStore.getState().drivers;

    if (!distributionResult) {
      throw new Error('No active distribution result to modify.');
    }

    if (!routeMatrix) {
      throw new Error('Road matrix is required for recalculating metrics.');
    }

    try {
      const updatedResult = container.reassignStopUseCase.execute({
        currentDistribution: distributionResult,
        stopId,
        targetDriverId,
        activeDrivers: drivers.filter(d => d.active),
        depot: settings.depot,
        matrix: routeMatrix,
        config: settings.optimizationConfig
      });

      set({
        distributionResult: updatedResult,
        optimizationErrorMessage: null
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        optimizationErrorMessage: msg
      });
      throw err;
    }
  },

  selectDriverRoute: (driverId: string | null) => {
    set({ selectedDriverRouteId: driverId });
  },

  resetOptimization: () => {
    set({
      optimizationStatus: 'IDLE',
      optimizationErrorMessage: null,
      distributionResult: null,
      selectedDriverRouteId: null
    });
  },

  resetSession: () => {
    set({
      currentImportResult: null,
      confirmedSession: null,
      status: 'IDLE',
      isProcessing: false,
      errorMessage: null,
      routingStatus: 'IDLE',
      routeMatrix: null,
      routingErrorMessage: null,
      optimizationStatus: 'IDLE',
      optimizationErrorMessage: null,
      rawDeliveryLists: [],
      deliveryStops: [],
      participatingDrivers: [],
      distributionResult: null,
      selectedDriverRouteId: null
    });
  }
}));
