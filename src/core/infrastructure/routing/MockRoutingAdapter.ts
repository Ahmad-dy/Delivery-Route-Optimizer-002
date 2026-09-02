import {
  IRoutingService,
  RouteMatrixRequest,
  RouteMatrix,
  RoutingMatrixElement,
  FullRouteCalculationRequest,
  FullRouteCalculationResult,
  RoutingDiagnostics,
  RoutePoint,
  RouteSegment,
  MatrixElementStatus
} from '../../application/ports/IRoutingService';
import { GeoPoint } from '../../domain/value-objects/GeoPoint';
import {
  RoutingUnavailableError,
  RoutingTimeoutError,
  RoutingQuotaError,
  RoutingNoRouteError
} from '../../domain/errors/DomainErrors';

export interface MockPairMetric {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly status?: MatrixElementStatus;
}

export class MockRoutingAdapter implements IRoutingService {
  private readonly customMetrics = new Map<string, MockPairMetric>();
  public simulateTimeout = false;
  public simulateQuotaError = false;
  public simulateUnavailable = false;
  public simulateTransientFailuresCount = 0;
  private currentFailureCount = 0;

  private requestCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private retryCount = 0;
  private failedRequests = 0;
  private totalRoutingDurationMs = 0;

  /**
   * Sets custom deterministic metrics for a specific origin-to-destination ID pair.
   * Enables strict testing of directional asymmetry (A->B != B->A) and exact Google metrics.
   */
  public setMockPairMetric(originId: string, destinationId: string, metric: MockPairMetric): void {
    const key = `${originId}->${destinationId}`;
    this.customMetrics.set(key, metric);
  }

  public getDiagnostics(): RoutingDiagnostics {
    return Object.freeze({
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      retryCount: this.retryCount,
      failedRequests: this.failedRequests,
      routingDurationMs: this.totalRoutingDurationMs,
      lastCallTimestamp: Date.now()
    });
  }

  public clearCache(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  public async getRouteMatrix(request: RouteMatrixRequest): Promise<RouteMatrix> {
    const startTime = Date.now();
    this.requestCount++;

    this.checkSimulatedErrors();

    const { origins, destinations } = request;
    const elements: RoutingMatrixElement[][] = [];

    for (let i = 0; i < origins.length; i++) {
      const row: RoutingMatrixElement[] = [];
      const origin = origins[i];

      for (let j = 0; j < destinations.length; j++) {
        const dest = destinations[j];

        if (origin.id === dest.id) {
          row.push({
            originId: origin.id,
            destinationId: dest.id,
            originIndex: i,
            destinationIndex: j,
            distanceMeters: 0,
            durationSeconds: 0,
            status: 'OK'
          });
          continue;
        }

        const customKey = `${origin.id}->${dest.id}`;
        const custom = this.customMetrics.get(customKey);

        if (custom) {
          row.push({
            originId: origin.id,
            destinationId: dest.id,
            originIndex: i,
            destinationIndex: j,
            distanceMeters: custom.distanceMeters,
            durationSeconds: custom.durationSeconds,
            status: custom.status || 'OK'
          });
        } else {
          // Deterministic mock formula based on coordinates (for tests without explicit mock pairs)
          const dist = MockRoutingAdapter.calculateApproxDistanceMeters(origin.point, dest.point);
          const dur = Math.round(dist / 11.11) + 120;

          row.push({
            originId: origin.id,
            destinationId: dest.id,
            originIndex: i,
            destinationIndex: j,
            distanceMeters: dist,
            durationSeconds: dur,
            status: 'OK'
          });
        }
      }
      elements.push(row);
    }

    this.totalRoutingDurationMs += Date.now() - startTime;

    return Object.freeze({
      origins: Object.freeze([...origins]),
      destinations: Object.freeze([...destinations]),
      elements: Object.freeze(elements.map(row => Object.freeze([...row])))
    });
  }

  public async calculateRoute(request: FullRouteCalculationRequest): Promise<FullRouteCalculationResult> {
    const startTime = Date.now();
    this.requestCount++;

    this.checkSimulatedErrors();

    const { origin, destination, waypoints = [] } = request;
    const orderedPoints: RoutePoint[] = [origin, ...waypoints, destination];
    const locationIds = orderedPoints.map(p => p.id);

    // Empty route / single point check
    if (orderedPoints.length <= 1 || (orderedPoints.length === 2 && origin.id === destination.id && waypoints.length === 0)) {
      this.totalRoutingDurationMs += Date.now() - startTime;
      return Object.freeze({
        locationIds: Object.freeze(locationIds),
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        legs: Object.freeze([])
      });
    }

    const legs: RouteSegment[] = [];
    let totalDist = 0;
    let totalDur = 0;

    for (let i = 0; i < orderedPoints.length - 1; i++) {
      const p1 = orderedPoints[i];
      const p2 = orderedPoints[i + 1];

      const customKey = `${p1.id}->${p2.id}`;
      const custom = this.customMetrics.get(customKey);

      let dist: number;
      let dur: number;

      if (custom) {
        if (custom.status && custom.status !== 'OK') {
          this.failedRequests++;
          throw new RoutingNoRouteError(p1.id, p2.id);
        }
        dist = custom.distanceMeters;
        dur = custom.durationSeconds;
      } else {
        dist = MockRoutingAdapter.calculateApproxDistanceMeters(p1.point, p2.point);
        dur = Math.round(dist / 11.11) + 120;
      }

      totalDist += dist;
      totalDur += dur;

      legs.push({
        originId: p1.id,
        destinationId: p2.id,
        origin: p1.point,
        destination: p2.point,
        distanceMeters: dist,
        durationSeconds: dur
      });
    }

    this.totalRoutingDurationMs += Date.now() - startTime;

    return Object.freeze({
      locationIds: Object.freeze(locationIds),
      totalDistanceMeters: totalDist,
      totalDurationSeconds: totalDur,
      encodedPolyline: 'mock_encoded_polyline_stage_4',
      legs: Object.freeze(legs)
    });
  }

  // Compatibility aliases
  public async computeDistanceMatrix(request: RouteMatrixRequest): Promise<RouteMatrix> {
    return this.getRouteMatrix(request);
  }

  public async computeFullRoute(request: FullRouteCalculationRequest): Promise<FullRouteCalculationResult> {
    return this.calculateRoute(request);
  }

  private checkSimulatedErrors(): void {
    if (this.simulateTimeout) {
      this.failedRequests++;
      throw new RoutingTimeoutError(15000);
    }
    if (this.simulateQuotaError) {
      this.failedRequests++;
      throw new RoutingQuotaError('Simulated 429 Quota Exceeded');
    }
    if (this.simulateUnavailable) {
      this.failedRequests++;
      throw new RoutingUnavailableError('Simulated 503 Service Unavailable');
    }
    if (this.currentFailureCount < this.simulateTransientFailuresCount) {
      this.currentFailureCount++;
      this.retryCount++;
      throw new RoutingUnavailableError('Simulated Transient Network Glitch');
    }
  }

  private static calculateApproxDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371000;
    const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.latitude * Math.PI) / 180) *
        Math.cos((p2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}
