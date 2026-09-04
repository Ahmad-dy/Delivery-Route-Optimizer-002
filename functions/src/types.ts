export interface DepotApprovalDTO {
  readonly latitude: number;
  readonly longitude: number;
  readonly name?: string;
}

export interface DriverApprovalDTO {
  readonly driverId: string;
  readonly driverName: string;
  readonly maximumLoadKg: number;
  readonly active: boolean;
}

export interface DeliveryListApprovalDTO {
  readonly listNumber: string;
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly weightKg: number;
}

export interface DeliveryStopApprovalDTO {
  readonly stopId: string;
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly lists: readonly DeliveryListApprovalDTO[];
  readonly totalWeightKg: number;
}

export interface RouteLegApprovalDTO {
  readonly originId: string;
  readonly destinationId: string;
  readonly distanceMeters: number;
  readonly durationSeconds: number;
}

export interface RouteApprovalDTO {
  readonly driverId: string;
  readonly orderedStops: readonly DeliveryStopApprovalDTO[];
  readonly totalWeightKg: number;
  readonly utilizationPercent: number;
  readonly totalDistanceMeters: number;
  readonly totalDurationSeconds: number;
  readonly polyline?: string;
  readonly isManuallyModified: boolean;
  readonly routingStatus?: 'OK' | 'ROUTING_UNAVAILABLE' | 'CALCULATING';
  readonly routingErrorMessage?: string;
  readonly legs?: readonly RouteLegApprovalDTO[];
}

export interface MetricsApprovalDTO {
  readonly initialDistanceMeters: number;
  readonly finalDistanceMeters: number;
  readonly initialLoadVariance: number;
  readonly finalLoadVariance: number;
  readonly finalOptimizationScore: number;
  readonly totalDurationSeconds: number;
  readonly iterationCount: number;
  readonly executionDurationMs: number;
  readonly activeDriversUsed: number;
}

export interface WarningApprovalDTO {
  readonly code: string;
  readonly message: string;
  readonly messageKey: string;
  readonly params?: Record<string, string | number>;
}

export interface ApproveDistributionPayload {
  readonly distributionId: string;
  readonly createdAt: string;
  readonly approvedAt?: string;
  readonly approvedBy?: string;
  readonly depot: DepotApprovalDTO;
  readonly drivers: readonly DriverApprovalDTO[];
  readonly routes: readonly RouteApprovalDTO[];
  readonly stops: readonly DeliveryStopApprovalDTO[];
  readonly unassigned: readonly DeliveryStopApprovalDTO[];
  readonly metrics: MetricsApprovalDTO;
  readonly optimizationScore: number;
  readonly warnings: readonly WarningApprovalDTO[];
}

export interface ApprovedDistributionRecord extends ApproveDistributionPayload {
  readonly approvedAt: string;
  readonly approvedBy: string;
  readonly approvedByUid: string;
  readonly approvedByEmail: string | null;
  readonly revision: number;
}
