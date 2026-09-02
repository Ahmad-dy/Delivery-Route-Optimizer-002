import { GeoPoint } from '../../domain/value-objects/GeoPoint';

export type MatrixElementStatus =
  | 'OK'
  | 'NOT_FOUND'
  | 'ZERO_RESULTS'
  | 'INVALID_ARGUMENT'
  | 'UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export interface RoutePoint {
  readonly id: string;
  readonly point: GeoPoint;
  readonly name?: string;
}

export interface RouteSegment {
  readonly originId: string;
  readonly destinationId: string;
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly distanceMeters: number;
  readonly durationSeconds: number;
}

export interface RoutingMatrixElement {
  readonly originId: string;
  readonly destinationId: string;
  readonly originIndex: number;
  readonly destinationIndex: number;
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly status: MatrixElementStatus;
  readonly condition?: string;
  readonly fallbackUsed?: boolean;
}

export interface RouteMatrixRequest {
  readonly origins: readonly RoutePoint[];
  readonly destinations: readonly RoutePoint[];
}

export interface RouteMatrix {
  readonly origins: readonly RoutePoint[];
  readonly destinations: readonly RoutePoint[];
  readonly elements: readonly (readonly RoutingMatrixElement[])[]; // [originIndex][destinationIndex]
}

export interface FullRouteCalculationRequest {
  readonly origin: RoutePoint;
  readonly destination: RoutePoint;
  readonly waypoints?: readonly RoutePoint[];
}

export interface FullRouteCalculationResult {
  readonly locationIds: readonly string[];
  readonly totalDistanceMeters: number;
  readonly totalDurationSeconds: number;
  readonly encodedPolyline?: string;
  readonly legs: readonly RouteSegment[];
}

export interface RoutingDiagnostics {
  readonly requestCount: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly retryCount: number;
  readonly failedRequests: number;
  readonly routingDurationMs: number;
  readonly lastCallTimestamp?: number;
  readonly l1Hits?: number;
  readonly l2Hits?: number;
  readonly isIndexedDbAvailable?: boolean;
}

export interface IRoutingService {
  /**
   * Computes N x M distance and duration matrix between origin and destination points using road network.
   */
  getRouteMatrix(request: RouteMatrixRequest): Promise<RouteMatrix>;

  /**
   * Computes full path routing for an ordered sequence of locations including polyline geometry.
   */
  calculateRoute(request: FullRouteCalculationRequest): Promise<FullRouteCalculationResult>;

  /**
   * Returns runtime observability statistics regarding API calls, cache performance, and retries.
   */
  getDiagnostics(): RoutingDiagnostics;

  /**
   * Clears internal routing cache.
   */
  clearCache(): void;

  // Compatibility aliases
  computeDistanceMatrix?(request: RouteMatrixRequest): Promise<RouteMatrix>;
  computeFullRoute?(request: FullRouteCalculationRequest): Promise<FullRouteCalculationResult>;
}
