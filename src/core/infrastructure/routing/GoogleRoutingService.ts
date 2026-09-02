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
import { IRoutingCache } from '../../application/ports/IRoutingCache';
import {
  IndexedDbRoutingCache,
  DEFAULT_ROUTING_CACHE_TTL_MS,
  ROUTING_CACHE_VERSION,
  COORDINATE_PRECISION
} from '../cache/IndexedDbRoutingCache';
import { GeoPoint } from '../../domain/value-objects/GeoPoint';
import {
  RoutingUnavailableError,
  RoutingTimeoutError,
  RoutingQuotaError,
  RoutingInvalidRequestError,
  RoutingNoRouteError
} from '../../domain/errors/DomainErrors';

export interface GoogleRoutingServiceConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly batchElementLimit?: number;
  readonly maxOriginsPerBatch?: number;
  readonly maxDestinationsPerBatch?: number;
  readonly concurrencyLimit?: number;
  readonly routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE';
  readonly cacheTtlMs?: number;
  readonly persistentCache?: IRoutingCache;
}

interface L1CacheEntry {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly status: MatrixElementStatus;
  readonly timestamp: number;
  readonly version: string;
}

export class GoogleRoutingService implements IRoutingService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly batchElementLimit: number;
  private readonly maxOriginsPerBatch: number;
  private readonly maxDestinationsPerBatch: number;
  private readonly concurrencyLimit: number;
  private readonly routingPreference: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE';
  private readonly cacheTtlMs: number;
  private readonly persistentCache: IRoutingCache;

  // L1 In-Memory Cache: Normalized key -> L1CacheEntry
  private readonly l1Cache = new Map<string, L1CacheEntry>();

  // Observability & diagnostics counters
  private requestCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private l1Hits = 0;
  private l2Hits = 0;
  private retryCount = 0;
  private failedRequests = 0;
  private totalRoutingDurationMs = 0;
  private lastCallTimestamp?: number;

  constructor(config: GoogleRoutingServiceConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.VITE_GOOGLE_MAPS_API_KEY || '' : '');
    this.baseUrl = config.baseUrl || 'https://routes.googleapis.com';
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 3;
    this.batchElementLimit = config.batchElementLimit ?? 625; // 25x25
    this.maxOriginsPerBatch = config.maxOriginsPerBatch ?? 25;
    this.maxDestinationsPerBatch = config.maxDestinationsPerBatch ?? 25;
    this.concurrencyLimit = config.concurrencyLimit ?? 3;
    this.routingPreference = config.routingPreference ?? 'TRAFFIC_UNAWARE';
    this.cacheTtlMs = config.cacheTtlMs ?? DEFAULT_ROUTING_CACHE_TTL_MS;
    this.persistentCache = config.persistentCache ?? new IndexedDbRoutingCache('DeliveryRouterCacheDB', 'routes_matrix_cache', this.cacheTtlMs);
  }

  public getDiagnostics(): RoutingDiagnostics {
    return Object.freeze({
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      l1Hits: this.l1Hits,
      l2Hits: this.l2Hits,
      retryCount: this.retryCount,
      failedRequests: this.failedRequests,
      routingDurationMs: this.totalRoutingDurationMs,
      lastCallTimestamp: this.lastCallTimestamp,
      isIndexedDbAvailable: this.persistentCache.isAvailable()
    });
  }

  public clearCache(): void {
    this.l1Cache.clear();
    this.persistentCache.clear().catch(() => {});
  }

  /**
   * Normalizes coordinates to a standard 6 decimal places string (approx. 10cm accuracy)
   */
  public static normalizeCoordinate(val: number): string {
    return Number(val).toFixed(COORDINATE_PRECISION);
  }

  /**
   * Generates a deterministic cache key for an origin-destination pair
   */
  public getCacheKey(origin: GeoPoint, destination: GeoPoint): string {
    const oLat = GoogleRoutingService.normalizeCoordinate(origin.latitude);
    const oLng = GoogleRoutingService.normalizeCoordinate(origin.longitude);
    const dLat = GoogleRoutingService.normalizeCoordinate(destination.latitude);
    const dLng = GoogleRoutingService.normalizeCoordinate(destination.longitude);
    return `${oLat},${oLng}->${dLat},${dLng}|DRIVE|${this.routingPreference}|${ROUTING_CACHE_VERSION}`;
  }

  public async getRouteMatrix(request: RouteMatrixRequest): Promise<RouteMatrix> {
    const startTime = Date.now();
    this.lastCallTimestamp = startTime;

    const { origins, destinations } = request;

    if (origins.length === 0 || destinations.length === 0) {
      return Object.freeze({
        origins: Object.freeze([...origins]),
        destinations: Object.freeze([...destinations]),
        elements: Object.freeze([])
      });
    }

    // Initialize the result matrix grid with explicit uncalculated state
    const matrixGrid: RoutingMatrixElement[][] = Array.from({ length: origins.length }, (_, oIdx) =>
      Array.from({ length: destinations.length }, (_, dIdx) => ({
        originId: origins[oIdx].id,
        destinationId: destinations[dIdx].id,
        originIndex: oIdx,
        destinationIndex: dIdx,
        distanceMeters: 0,
        durationSeconds: 0,
        status: 'UNKNOWN_ERROR'
      }))
    );

    // Identify which pairs are already cached or identical
    const missingPairs: { originIdx: number; destIdx: number; origin: RoutePoint; dest: RoutePoint }[] = [];

    for (let o = 0; o < origins.length; o++) {
      const orig = origins[o];
      for (let d = 0; d < destinations.length; d++) {
        const dest = destinations[d];

        // Case 1: Identical coordinates (same point)
        if (
          GoogleRoutingService.normalizeCoordinate(orig.point.latitude) ===
            GoogleRoutingService.normalizeCoordinate(dest.point.latitude) &&
          GoogleRoutingService.normalizeCoordinate(orig.point.longitude) ===
            GoogleRoutingService.normalizeCoordinate(dest.point.longitude)
        ) {
          matrixGrid[o][d] = {
            originId: orig.id,
            destinationId: dest.id,
            originIndex: o,
            destinationIndex: d,
            distanceMeters: 0,
            durationSeconds: 0,
            status: 'OK'
          };
          this.cacheHits++;
          this.l1Hits++;
          continue;
        }

        const cacheKey = this.getCacheKey(orig.point, dest.point);

        // Case 2: Check L1 Memory Cache with TTL & Version validation
        const l1Entry = this.l1Cache.get(cacheKey);
        if (l1Entry) {
          const now = Date.now();
          if (l1Entry.version === ROUTING_CACHE_VERSION && now - l1Entry.timestamp <= this.cacheTtlMs) {
            this.cacheHits++;
            this.l1Hits++;
            matrixGrid[o][d] = {
              originId: orig.id,
              destinationId: dest.id,
              originIndex: o,
              destinationIndex: d,
              distanceMeters: l1Entry.distanceMeters,
              durationSeconds: l1Entry.durationSeconds,
              status: l1Entry.status
            };
            continue;
          } else {
            // Expired or incompatible version in L1
            this.l1Cache.delete(cacheKey);
            this.persistentCache.delete(cacheKey).catch(() => {});
          }
        }

        // Case 3: Check L2 Persistent Cache (IndexedDB)
        const l2Entry = await this.persistentCache.get(cacheKey);
        if (l2Entry) {
          // Valid L2 Hit -> populate L1 memory cache
          this.l1Cache.set(cacheKey, {
            distanceMeters: l2Entry.distanceMeters,
            durationSeconds: l2Entry.durationSeconds,
            status: l2Entry.status,
            timestamp: l2Entry.timestamp,
            version: l2Entry.version
          });
          this.cacheHits++;
          this.l2Hits++;
          matrixGrid[o][d] = {
            originId: orig.id,
            destinationId: dest.id,
            originIndex: o,
            destinationIndex: d,
            distanceMeters: l2Entry.distanceMeters,
            durationSeconds: l2Entry.durationSeconds,
            status: l2Entry.status
          };
          continue;
        }

        // Case 4: Cache Miss -> Requires Google Routes API call
        this.cacheMisses++;
        missingPairs.push({ originIdx: o, destIdx: d, origin: orig, dest: dest });
      }
    }

    // If all pairs were cached or identical, return immediately
    if (missingPairs.length === 0) {
      this.totalRoutingDurationMs += Date.now() - startTime;
      return Object.freeze({
        origins: Object.freeze([...origins]),
        destinations: Object.freeze([...destinations]),
        elements: Object.freeze(matrixGrid.map(row => Object.freeze([...row])))
      });
    }

    // Verify API Key availability
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      this.failedRequests++;
      throw new RoutingUnavailableError(
        'Google Routes API key is not configured. Please define VITE_GOOGLE_MAPS_API_KEY in your environment.',
        { missingPairsCount: missingPairs.length }
      );
    }

    // Chunk origins and destinations into sub-batches
    const originChunks = this.chunkArray(origins, this.maxOriginsPerBatch);
    const destChunks = this.chunkArray(destinations, this.maxDestinationsPerBatch);

    const batchTasks: (() => Promise<void>)[] = [];

    for (let oc = 0; oc < originChunks.length; oc++) {
      const subOrigins = originChunks[oc];
      const originOffset = oc * this.maxOriginsPerBatch;

      for (let dc = 0; dc < destChunks.length; dc++) {
        const subDestinations = destChunks[dc];
        const destOffset = dc * this.maxDestinationsPerBatch;

        batchTasks.push(async () => {
          await this.executeMatrixBatch(
            subOrigins,
            subDestinations,
            originOffset,
            destOffset,
            matrixGrid
          );
        });
      }
    }

    // Execute batch tasks with controlled concurrency
    await this.runWithConcurrency(batchTasks, this.concurrencyLimit);

    this.totalRoutingDurationMs += Date.now() - startTime;

    return Object.freeze({
      origins: Object.freeze([...origins]),
      destinations: Object.freeze([...destinations]),
      elements: Object.freeze(matrixGrid.map(row => Object.freeze([...row])))
    });
  }

  private async executeMatrixBatch(
    subOrigins: readonly RoutePoint[],
    subDestinations: readonly RoutePoint[],
    originOffset: number,
    destOffset: number,
    matrixGrid: RoutingMatrixElement[][]
  ): Promise<void> {
    const url = `${this.baseUrl}/distanceMatrix/v2:computeRouteMatrix`;
    const body = {
      origins: subOrigins.map(o => ({
        waypoint: {
          location: {
            latLng: {
              latitude: o.point.latitude,
              longitude: o.point.longitude
            }
          }
        }
      })),
      destinations: subDestinations.map(d => ({
        waypoint: {
          location: {
            latLng: {
              latitude: d.point.latitude,
              longitude: d.point.longitude
            }
          }
        }
      })),
      travelMode: 'DRIVE',
      routingPreference: this.routingPreference
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,status,condition,distanceMeters,duration'
    };

    const rawResponse = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    let items: Record<string, unknown>[] = [];
    if (Array.isArray(rawResponse)) {
      items = rawResponse.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
    } else if (rawResponse && typeof rawResponse === 'object') {
      items = [rawResponse as Record<string, unknown>];
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      const subOrigIdx = typeof item.originIndex === 'number' ? item.originIndex : 0;
      const subDestIdx = typeof item.destinationIndex === 'number' ? item.destinationIndex : 0;

      const globalOrigIdx = originOffset + subOrigIdx;
      const globalDestIdx = destOffset + subDestIdx;

      if (globalOrigIdx >= matrixGrid.length || globalDestIdx >= (matrixGrid[globalOrigIdx]?.length || 0)) {
        continue;
      }

      const origPoint = subOrigins[subOrigIdx];
      const destPoint = subDestinations[subDestIdx];

      if (!origPoint || !destPoint) continue;

      // Parse status robustly
      let status: MatrixElementStatus = 'OK';
      const itemStatus = typeof item.status === 'object' && item.status !== null ? (item.status as { code?: number }) : undefined;
      if (itemStatus && typeof itemStatus.code === 'number' && itemStatus.code !== 0) {
        if (itemStatus.code === 3) status = 'INVALID_ARGUMENT';
        else if (itemStatus.code === 5) status = 'NOT_FOUND';
        else if (itemStatus.code === 14) status = 'UNAVAILABLE';
        else status = 'UNKNOWN_ERROR';
      } else if (item.condition === 'ROUTE_NOT_FOUND') {
        status = 'NOT_FOUND';
      } else if (item.condition === 'ZERO_RESULTS') {
        status = 'ZERO_RESULTS';
      }

      const isDiagonal =
        GoogleRoutingService.normalizeCoordinate(origPoint.point.latitude) ===
          GoogleRoutingService.normalizeCoordinate(destPoint.point.latitude) &&
        GoogleRoutingService.normalizeCoordinate(origPoint.point.longitude) ===
          GoogleRoutingService.normalizeCoordinate(destPoint.point.longitude);

      const parsedDuration = this.parseDurationToSeconds(item.duration);
      const hasDuration = parsedDuration !== null;
      const hasDistance = typeof item.distanceMeters === 'number' && Number.isFinite(item.distanceMeters) && item.distanceMeters >= 0;

      let distanceMeters = hasDistance ? (item.distanceMeters as number) : 0;
      let durationSeconds = hasDuration ? parsedDuration : 0;

      if (isDiagonal) {
        distanceMeters = 0;
        durationSeconds = 0;
        status = 'OK';
      } else {
        // If distance OR duration is missing/invalid on a non-diagonal element, status must be UNKNOWN_ERROR
        if ((!hasDistance || !hasDuration) && status === 'OK') {
          status = 'UNKNOWN_ERROR';
        }
      }

      const matrixElement: RoutingMatrixElement = {
        originId: origPoint.id,
        destinationId: destPoint.id,
        originIndex: globalOrigIdx,
        destinationIndex: globalDestIdx,
        distanceMeters,
        durationSeconds,
        status,
        condition: typeof item.condition === 'string' ? item.condition : undefined
      };

      matrixGrid[globalOrigIdx][globalDestIdx] = matrixElement;

      // Only cache valid or explicit responses (avoid caching transient unknown errors)
      if (status === 'OK' || status === 'NOT_FOUND' || status === 'ZERO_RESULTS') {
        const cacheKey = this.getCacheKey(origPoint.point, destPoint.point);
        const timestamp = Date.now();

        // Write to L1
        this.l1Cache.set(cacheKey, {
          distanceMeters,
          durationSeconds,
          status,
          timestamp,
          version: ROUTING_CACHE_VERSION
        });

        // Write to L2
        this.persistentCache.set(cacheKey, {
          key: cacheKey,
          distanceMeters,
          durationSeconds,
          status,
          timestamp,
          version: ROUTING_CACHE_VERSION,
          routingPreference: this.routingPreference
        }).catch(() => {});
      }
    }
  }

  public async calculateRoute(request: FullRouteCalculationRequest): Promise<FullRouteCalculationResult> {
    const startTime = Date.now();
    this.lastCallTimestamp = startTime;

    const { origin, destination, waypoints = [] } = request;
    const orderedPoints = [origin, ...waypoints, destination];
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

    if (!this.apiKey || this.apiKey.trim().length === 0) {
      this.failedRequests++;
      throw new RoutingUnavailableError(
        'Google Routes API key is not configured. Please define VITE_GOOGLE_MAPS_API_KEY in your environment.'
      );
    }

    const url = `${this.baseUrl}/directions/v2:computeRoutes`;
    const intermediates = waypoints.map(w => ({
      location: {
        latLng: {
          latitude: w.point.latitude,
          longitude: w.point.longitude
        }
      }
    }));

    const body = {
      origin: {
        location: {
          latLng: {
            latitude: origin.point.latitude,
            longitude: origin.point.longitude
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.point.latitude,
            longitude: destination.point.longitude
          }
        }
      },
      intermediates: intermediates.length > 0 ? intermediates : undefined,
      travelMode: 'DRIVE',
      routingPreference: this.routingPreference,
      polylineQuality: 'OVERVIEW',
      computeAlternativeRoutes: false
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs'
    };

    const rawResponse = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const response = rawResponse as { routes?: Record<string, unknown>[] } | null;

    if (!response || !response.routes || !Array.isArray(response.routes) || response.routes.length === 0) {
      this.failedRequests++;
      throw new RoutingNoRouteError(origin.id, destination.id, { waypointsCount: waypoints.length });
    }

    const routeData = response.routes[0];
    const hasTotalDistance = typeof routeData.distanceMeters === 'number' && Number.isFinite(routeData.distanceMeters) && routeData.distanceMeters >= 0;
    const parsedTotalDuration = this.parseDurationToSeconds(routeData.duration);
    const totalDistanceMeters = hasTotalDistance ? (routeData.distanceMeters as number) : 0;
    const totalDurationSeconds = parsedTotalDuration !== null ? parsedTotalDuration : 0;
    const polylineObj = typeof routeData.polyline === 'object' && routeData.polyline !== null ? (routeData.polyline as { encodedPolyline?: string }) : undefined;
    const encodedPolyline = polylineObj?.encodedPolyline;

    const legs: RouteSegment[] = [];
    if (Array.isArray(routeData.legs)) {
      for (let i = 0; i < routeData.legs.length; i++) {
        const leg = routeData.legs[i] as Record<string, unknown>;
        const legOrig = orderedPoints[i];
        const legDest = orderedPoints[i + 1];

        if (legOrig && legDest) {
          const hasLegDistance = typeof leg.distanceMeters === 'number' && Number.isFinite(leg.distanceMeters) && leg.distanceMeters >= 0;
          const parsedLegDur = this.parseDurationToSeconds(leg.duration);
          const legDist = hasLegDistance ? (leg.distanceMeters as number) : 0;
          const legDur = parsedLegDur !== null ? parsedLegDur : 0;

          legs.push({
            originId: legOrig.id,
            destinationId: legDest.id,
            origin: legOrig.point,
            destination: legDest.point,
            distanceMeters: legDist,
            durationSeconds: legDur
          });

          // Also populate pair cache from leg if valid
          if (hasLegDistance && parsedLegDur !== null) {
            const cacheKey = this.getCacheKey(legOrig.point, legDest.point);
            const timestamp = Date.now();
            this.l1Cache.set(cacheKey, {
              distanceMeters: legDist,
              durationSeconds: legDur,
              status: 'OK',
              timestamp,
              version: ROUTING_CACHE_VERSION
            });
            this.persistentCache.set(cacheKey, {
              key: cacheKey,
              distanceMeters: legDist,
              durationSeconds: legDur,
              status: 'OK',
              timestamp,
              version: ROUTING_CACHE_VERSION,
              routingPreference: this.routingPreference
            }).catch(() => {});
          }
        }
      }
    }

    this.totalRoutingDurationMs += Date.now() - startTime;

    return Object.freeze({
      locationIds: Object.freeze(locationIds),
      totalDistanceMeters,
      totalDurationSeconds,
      encodedPolyline,
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

  /**
   * Helper to perform HTTP fetch with timeout, error mapping, and exponential backoff retry
   */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<unknown> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      this.requestCount++;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });
        clearTimeout(timer);

        if (response.ok) {
          const json: unknown = await response.json();
          return json;
        }

        const statusCode = response.status;
        const errorBody = await response.text().catch(() => '');

        // 429 Too Many Requests
        if (statusCode === 429) {
          if (attempt <= this.maxRetries) {
            this.retryCount++;
            await this.sleep(Math.pow(2, attempt - 1) * 500);
            continue;
          }
          this.failedRequests++;
          throw new RoutingQuotaError(`Google Routes API rate limit/quota reached (HTTP 429): ${errorBody}`);
        }

        // 400 Bad Request
        if (statusCode === 400) {
          this.failedRequests++;
          throw new RoutingInvalidRequestError(`Invalid request sent to Google Routes API (HTTP 400): ${errorBody}`);
        }

        // 401 / 403 Authentication / Authorization
        if (statusCode === 401 || statusCode === 403) {
          this.failedRequests++;
          throw new RoutingUnavailableError(`Google Routes API authentication failed (HTTP ${statusCode}): ${errorBody}`);
        }

        // 5xx Server Errors (transient - retry)
        if (statusCode >= 500 && statusCode < 600) {
          if (attempt <= this.maxRetries) {
            this.retryCount++;
            await this.sleep(Math.pow(2, attempt - 1) * 500);
            continue;
          }
          this.failedRequests++;
          throw new RoutingUnavailableError(`Google Routes service unavailable (HTTP ${statusCode}): ${errorBody}`);
        }

        // Other status codes
        this.failedRequests++;
        throw new RoutingUnavailableError(`Google Routes request failed with HTTP ${statusCode}: ${errorBody}`);
      } catch (err: unknown) {
        clearTimeout(timer);

        if (
          err instanceof RoutingQuotaError ||
          err instanceof RoutingInvalidRequestError ||
          err instanceof RoutingUnavailableError ||
          err instanceof RoutingTimeoutError
        ) {
          throw err;
        }

        const isAbortError =
          (err instanceof Error && err.name === 'AbortError') ||
          (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError');

        if (isAbortError) {
          if (attempt <= this.maxRetries) {
            this.retryCount++;
            await this.sleep(Math.pow(2, attempt - 1) * 500);
            continue;
          }
          this.failedRequests++;
          throw new RoutingTimeoutError(this.timeoutMs);
        }

        lastError = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown network error');
        if (attempt <= this.maxRetries) {
          this.retryCount++;
          await this.sleep(Math.pow(2, attempt - 1) * 500);
          continue;
        }
      }
    }

    this.failedRequests++;
    throw new RoutingUnavailableError(
      `Google Routes API request failed after ${this.maxRetries} retries: ${lastError?.message || 'Network failure'}`
    );
  }

  private parseDurationToSeconds(duration: unknown): number | null {
    if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0) {
      return Math.round(duration);
    }
    if (typeof duration === 'string') {
      const match = duration.trim().match(/^([0-9]+(?:\.[0-9]+)?)s?$/);
      if (match) {
        const val = parseFloat(match[1]);
        if (Number.isFinite(val) && val >= 0) {
          return Math.round(val);
        }
      }
    }
    return null;
  }

  private chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize) as T[]);
    }
    return chunks;
  }

  private async runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const p = Promise.resolve().then(() => task()).then(res => {
        results.push(res);
      });

      const wrapper = p.then(() => {
        const index = executing.indexOf(wrapper);
        if (index !== -1) executing.splice(index, 1);
      });

      executing.push(wrapper);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
