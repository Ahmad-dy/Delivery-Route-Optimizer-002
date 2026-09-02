# Google Routing & Distance Matrix Specification

## 1. Routing Principles & Provider Decoupling

A core architectural invariant of this platform is that **all optimization decisions, distance metrics, and travel durations must be calculated using real road-driving networks**. Straight-line Euclidean distance or Haversine formulas are **strictly prohibited** as optimization metrics because real-world river crossings, one-way networks, highways, and physical barriers drastically diverge from geometric straight lines.

```
┌────────────────────────────────────────────────────────┐
│                   OPTIMIZATION ENGINE                  │
│  (Depends only on IRoutingService, no vendor coupling) │
└───────────────────────────┬────────────────────────────┘
                            │ (Calls IRoutingService)
┌───────────────────────────▼────────────────────────────┐
│              IROUTINGSERVICE ABSTRACTION               │
│  - getRouteMatrix(origins, destinations)               │
│  - calculateRoute(origin, waypoints, destination)      │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
┌───────────▼────────────────────┐  ┌────────▼───────────────────┐
│     GOOGLE ROUTES ADAPTER      │  │     MOCK ROUTING ADAPTER   │
│  - REST / Compute Route Matrix │  │  (Used for Unit Tests,     │
│  - Polyline Decoding & Cache   │  │   Offline Verification)    │
└────────────────────────────────┘  └────────────────────────────┘
```

---

## 2. Service Abstraction Interface

```typescript
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

export interface RouteMatrix {
  readonly origins: readonly RoutePoint[];
  readonly destinations: readonly RoutePoint[];
  readonly elements: readonly (readonly RoutingMatrixElement[])[]; // [originIndex][destinationIndex]
}

export interface FullRouteCalculationResult {
  readonly locationIds: readonly string[];
  readonly totalDistanceMeters: number;
  readonly totalDurationSeconds: number;
  readonly encodedPolyline?: string;
  readonly legs: readonly RouteSegment[];
}

export interface IRoutingService {
  /**
   * Computes an N x M road distance and duration matrix for given origins and destinations.
   */
  getRouteMatrix(request: RouteMatrixRequest): Promise<RouteMatrix>;

  /**
   * Computes full driving route details and polylines for an ordered sequence of stops.
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
}
```

---

## 3. Google Routes API Integration (v2 REST)

### 3.1. API Endpoints
1. **Compute Route Matrix (Batched)**:
   - Endpoint: `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
   - Method: `POST`
   - Travel Mode: `DRIVE`
   - Routing Preference: `TRAFFIC_UNAWARE` (or `TRAFFIC_AWARE`)
   - Headers:
     - `Content-Type`: `application/json`
     - `X-Goog-Api-Key`: Configured API Key
     - `X-Goog-FieldMask`: `originIndex,destinationIndex,status,condition,distanceMeters,duration`
2. **Compute Routes (Polyline & Legs)**:
   - Endpoint: `https://routes.googleapis.com/directions/v2:computeRoutes`
   - Method: `POST`
   - Travel Mode: `DRIVE`
   - Headers:
     - `Content-Type`: `application/json`
     - `X-Goog-Api-Key`: Configured API Key
     - `X-Goog-FieldMask`: `routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs`

---

## 4. Multi-Tier Matrix Caching & Performance Architecture

### 4.1. Coordinate Normalization & Cache Hierarchy
To minimize redundant Google API requests and strictly avoid duplicate billing:
- **Cache Hierarchy**:
  ```
  [ Request (Origins × Destinations) ]
                 │
                 ▼
  [ L1 In-Memory Fast Map Cache ] ──── Hit (valid TTL & version) ──► Return Cached Value
                 │ (Miss / Expired)
                 ▼
  [ L2 IndexedDB Persistent Cache ] ── Hit (valid TTL & version) ──► Populate L1 & Return
                 │ (Miss / Expired / Unavailable)
                 ▼
  [ Google Routes API Request ]
                 │
                 ▼ (Success)
  [ Write to L1 In-Memory & L2 IndexedDB Cache ]
  ```
- **Coordinate Precision**:
  - Authoritative precision: **6 decimal places** (`toFixed(6)`), providing ~0.1m accuracy to prevent cache collisions while grouping identical pickup/dropoff points.
- **Cache Key Specification**:
  The cache key includes complete routing context to strictly prevent incorrect reuse across different profiles:
  $$\text{Key} = \text{originLat}_{(6\text{dec})},\text{originLng}_{(6\text{dec})}\to\text{destLat}_{(6\text{dec})},\text{destLng}_{(6\text{dec})}\,|\,\text{DRIVE}\,|\,\text{routingPreference}\,|\,\text{cacheVersion}$$
  - `cacheVersion`: Centralized version tag (`ROUTING_CACHE_VERSION = 'v1'`).
  - Directional asymmetry is preserved (A → B is cached independently from B → A).
- **TTL Validation**:
  - Default TTL: **7 days** (`7 * 24 * 60 * 60 * 1000` ms).
  - Stale entries (`now - timestamp > TTL`) are automatically treated as misses, removed from storage, and refetched.
- **IndexedDB Fallback**:
  - If IndexedDB is unavailable (e.g., SSR, automated test environment, browser private mode quota lock), the system gracefully degrades to `L1 Memory Cache → Google Routes API` without throwing exceptions or failing routing calculations.

### 4.2. Batching Strategy for Large Stop Sets
- Google Route Matrix API supports up to 625 elements ($25 \times 25$) per batch.
- When an operation contains $N > 25$ stops:
  - The routing adapter partitions the coordinate matrix into $(25 \times 25)$ sub-grids.
  - Sub-grid requests are executed with concurrency control (`concurrencyLimit = 3`) to respect rate limits.
  - Global matrix indices (`originIndex`, `destinationIndex`) are accurately mapped back to the overall result grid.

---

## 5. Resilience, Retry Policy & Failure Handling

### 5.1. Strict Prohibition of Degraded Straight-Line Optimization
**Under no circumstances will straight-line (Euclidean/Haversine) distance or artificial "Haversine × road factor" approximations be used to determine driver assignments or final route optimization.** Road infrastructure, physical barriers, and traffic networks strictly require true road metrics for legal, operational, and financial feasibility.

### 5.2. Failure & Triage Pipeline

```
[ Matrix Calculation Request ]
            │
            ▼
[ Check L1 Memory & L2 IndexedDB Cache ] ──── All Hit ────► [ Return Verified Cached Matrix ]
            │
      Some Misses
            ▼
[ Google Routes API Call ] ──── Success ────► [ Write to L1 & L2 Cache & Return ]
            │
        API Failure (Network / Quota 429 / 5xx)
            │
      [ Exponential Backoff Retry ]
        - Attempt 1: Backoff (500ms)
        - Attempt 2: Exponential backoff (1000ms)
        - Attempt 3: Final backoff (2000ms)
            │
      Still Failing after retries?
            │
            ▼
[ ROUTING_UNAVAILABLE / QUOTA / TIMEOUT Triggered ]
  - Throw typed Domain error: `RoutingUnavailableError`, `RoutingQuotaError`, or `RoutingTimeoutError`.
  - The optimization engine MUST NOT produce or confirm a final distribution result with fabricated distances.
```

---

## 6. Map Polyline Rendering

- When a route is computed, `calculateRoute` retrieves the Google Routes encoded polyline (`routes.polyline.encodedPolyline`).
- Presentation Layer decodes the polyline into coordinate paths on the interactive map.
