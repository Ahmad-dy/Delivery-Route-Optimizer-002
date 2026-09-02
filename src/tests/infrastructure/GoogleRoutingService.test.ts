import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoogleRoutingService } from '../../core/infrastructure/routing/GoogleRoutingService';
import { InMemoryRoutingCache } from '../../core/infrastructure/cache/InMemoryRoutingCache';
import { GeoPoint } from '../../core/domain/value-objects/GeoPoint';
import { RoutePoint } from '../../core/application/ports/IRoutingService';
import {
  RoutingUnavailableError,
  RoutingTimeoutError,
  RoutingQuotaError,
  RoutingInvalidRequestError,
  RoutingNoRouteError
} from '../../core/domain/errors/DomainErrors';

describe('Stage 4 Hardening: GoogleRoutingService Adapter Integration & Resilience', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const pDepot: RoutePoint = { id: 'DEPOT', point: new GeoPoint(33.3152, 44.3661), name: 'Central Depot' };
  const pA: RoutePoint = { id: 'STOP_A', point: new GeoPoint(33.3128, 44.3546), name: 'Stop A' };
  const pB: RoutePoint = { id: 'STOP_B', point: new GeoPoint(33.3054, 44.4215), name: 'Stop B' };
  const pC: RoutePoint = { id: 'STOP_C', point: new GeoPoint(33.2981, 44.3318), name: 'Stop C' };

  describe('1. Google Compute Route Matrix API Request Format', () => {
    it('sends correct POST request with field masks, travelMode DRIVE, and routing preference', async () => {
      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        capturedUrl = url.toString();
        capturedInit = init;
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              originIndex: 0,
              destinationIndex: 1,
              distanceMeters: 3500,
              duration: '480s',
              condition: 'ROUTE_EXISTS'
            }
          ]
        };
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-google-api-key-12345',
        routingPreference: 'TRAFFIC_UNAWARE',
        persistentCache: new InMemoryRoutingCache()
      });

      await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      expect(capturedUrl).toBe('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix');
      expect(capturedInit?.method).toBe('POST');

      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Goog-Api-Key']).toBe('test-google-api-key-12345');
      expect(headers['X-Goog-FieldMask']).toBe('originIndex,destinationIndex,status,condition,distanceMeters,duration');

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.travelMode).toBe('DRIVE');
      expect(body.routingPreference).toBe('TRAFFIC_UNAWARE');
      expect(body.origins.length).toBe(1);
      expect(body.destinations.length).toBe(2);
      expect(body.origins[0].waypoint.location.latLng.latitude).toBe(33.3152);
    });
  });

  describe('2. Google Compute Routes API Request Format', () => {
    it('sends correct POST request to computeRoutes with polyline and leg masks', async () => {
      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        capturedUrl = url.toString();
        capturedInit = init;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            routes: [
              {
                distanceMeters: 8500,
                duration: '1100s',
                polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
                legs: [
                  {
                    distanceMeters: 4500,
                    duration: '600s'
                  },
                  {
                    distanceMeters: 4000,
                    duration: '500s'
                  }
                ]
              }
            ]
          })
        };
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const result = await service.calculateRoute({
        origin: pDepot,
        waypoints: [pA],
        destination: pDepot
      });

      expect(capturedUrl).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
      expect(capturedInit?.method).toBe('POST');

      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers['X-Goog-FieldMask']).toBe('routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs');

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.travelMode).toBe('DRIVE');
      expect(body.origin.location.latLng.latitude).toBe(pDepot.point.latitude);
      expect(body.destination.location.latLng.latitude).toBe(pDepot.point.latitude);
      expect(body.intermediates.length).toBe(1);

      expect(result.totalDistanceMeters).toBe(8500);
      expect(result.totalDurationSeconds).toBe(1100);
      expect(result.encodedPolyline).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
      expect(result.legs.length).toBe(2);
      expect(result.legs[0].originId).toBe('DEPOT');
      expect(result.legs[0].destinationId).toBe('STOP_A');
      expect(result.legs[1].originId).toBe('STOP_A');
      expect(result.legs[1].destinationId).toBe('DEPOT');
    });
  });

  describe('3. Matrix Response Parsing & Directional Asymmetry', () => {
    it('correctly parses directional asymmetric road metrics (A -> B != B -> A)', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          { originIndex: 0, destinationIndex: 1, distanceMeters: 5200, duration: '720s', status: { code: 0 } },
          { originIndex: 1, destinationIndex: 0, distanceMeters: 6100, duration: '900s', status: { code: 0 } }
        ]
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pA, pB],
        destinations: [pA, pB]
      });

      // Diagonal A -> A
      expect(matrix.elements[0][0].distanceMeters).toBe(0);
      expect(matrix.elements[0][0].durationSeconds).toBe(0);
      expect(matrix.elements[0][0].status).toBe('OK');

      // A -> B
      expect(matrix.elements[0][1].distanceMeters).toBe(5200);
      expect(matrix.elements[0][1].durationSeconds).toBe(720);
      expect(matrix.elements[0][1].status).toBe('OK');

      // B -> A (Different distance/duration, never mirrored)
      expect(matrix.elements[1][0].distanceMeters).toBe(6100);
      expect(matrix.elements[1][0].durationSeconds).toBe(900);
      expect(matrix.elements[1][0].status).toBe('OK');
      expect(matrix.elements[0][1].distanceMeters).not.toBe(matrix.elements[1][0].distanceMeters);

      // Diagonal B -> B
      expect(matrix.elements[1][1].distanceMeters).toBe(0);
      expect(matrix.elements[1][1].durationSeconds).toBe(0);
      expect(matrix.elements[1][1].status).toBe('OK');
    });
  });

  describe('4. Matrix Batching for Sub-Grids', () => {
    it('partitions large matrices into sub-batches and reassembles correctly', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        callCount++;
        const body = JSON.parse(init.body as string);
        const subOriginsCount = body.origins.length;
        const subDestsCount = body.destinations.length;

        // Return mock sub-grid response
        const items = [];
        for (let o = 0; o < subOriginsCount; o++) {
          for (let d = 0; d < subDestsCount; d++) {
            items.push({
              originIndex: o,
              destinationIndex: d,
              distanceMeters: (o + 1) * 1000 + (d + 1) * 100,
              duration: `${(o + 1) * 120 + (d + 1) * 10}s`,
              status: { code: 0 }
            });
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => items
        };
      });

      // Configure service with small batch size: max 2 origins and 2 destinations per batch
      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        maxOriginsPerBatch: 2,
        maxDestinationsPerBatch: 2,
        persistentCache: new InMemoryRoutingCache()
      });

      // Request 4 origins x 4 destinations -> should split into 2x2 = 4 batches
      const points = [pDepot, pA, pB, pC];
      const result = await service.getRouteMatrix({
        origins: points,
        destinations: points
      });

      expect(callCount).toBe(4);
      expect(result.elements.length).toBe(4);
      expect(result.elements[0].length).toBe(4);

      // Verify non-diagonal cells were correctly populated
      expect(result.elements[0][1].distanceMeters).toBeGreaterThan(0);
      expect(result.elements[3][2].distanceMeters).toBeGreaterThan(0);
      expect(result.elements[3][3].distanceMeters).toBe(0); // self diagonal
    });
  });

  describe('5. Multi-Tier Cache Hierarchy (L1 & L2) & TTL Expiration', () => {
    it('returns cached results on second request without triggering Google API', async () => {
      let apiCalls = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        apiCalls++;
        return {
          ok: true,
          status: 200,
          json: async () => [
            { originIndex: 0, destinationIndex: 1, distanceMeters: 4200, duration: '600s', status: { code: 0 } }
          ]
        };
      });

      const memCache = new InMemoryRoutingCache();
      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: memCache
      });

      // 1st call -> Google API call (Cache Miss)
      const res1 = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      expect(apiCalls).toBe(1);
      expect(res1.elements[0][1].distanceMeters).toBe(4200);

      // 2nd call -> Cache Hit (L1)
      const res2 = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      expect(apiCalls).toBe(1); // Google API NOT called again
      expect(res2.elements[0][1].distanceMeters).toBe(4200);

      const diag = service.getDiagnostics();
      expect(diag.cacheHits).toBeGreaterThan(0);
    });

    it('re-fetches from Google when cache TTL expires', async () => {
      let apiCalls = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        apiCalls++;
        return {
          ok: true,
          status: 200,
          json: async () => [
            { originIndex: 0, destinationIndex: 1, distanceMeters: 4200, duration: '600s', status: { code: 0 } }
          ]
        };
      });

      // Set very short TTL (50ms)
      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        cacheTtlMs: 50,
        persistentCache: new InMemoryRoutingCache(50)
      });

      await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });
      expect(apiCalls).toBe(1);

      // Wait 70ms for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 70));

      // Same request -> should be treated as cache miss and trigger Google API
      await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });
      expect(apiCalls).toBe(2);
    });

    it('fetches from L2 persistent cache when L1 misses and populates L1', async () => {
      let apiCalls = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        apiCalls++;
        return {
          ok: true,
          status: 200,
          json: async () => [
            { originIndex: 0, destinationIndex: 1, distanceMeters: 5500, duration: '750s', status: { code: 0 } }
          ]
        };
      });

      const sharedPersistentCache = new InMemoryRoutingCache();

      // Instance 1 writes to cache
      const service1 = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: sharedPersistentCache
      });

      await service1.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });
      expect(apiCalls).toBe(1);

      // Instance 2 has fresh L1 memory cache but shares L2 persistent cache
      const service2 = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: sharedPersistentCache
      });

      const res = await service2.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      expect(apiCalls).toBe(1); // Not called again
      expect(res.elements[0][1].distanceMeters).toBe(5500);

      const diag = service2.getDiagnostics();
      expect(diag.l2Hits).toBe(1);
    });
  });

  describe('6. Resilience & Retry Policy', () => {
    it('retries on HTTP 429 Rate Limit and succeeds when subsequent attempt returns 200', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          return {
            ok: false,
            status: 429,
            text: async () => 'Rate limit exceeded'
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => [
            { originIndex: 0, destinationIndex: 1, distanceMeters: 3000, duration: '400s', status: { code: 0 } }
          ]
        };
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        maxRetries: 3,
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      expect(attempts).toBe(3);
      expect(matrix.elements[0][1].distanceMeters).toBe(3000);
      expect(service.getDiagnostics().retryCount).toBe(2);
    });

    it('retries on HTTP 500/503 Transient Server Errors and succeeds', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          return {
            ok: false,
            status: 503,
            text: async () => 'Service Unavailable'
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => [
            { originIndex: 0, destinationIndex: 1, distanceMeters: 3000, duration: '400s', status: { code: 0 } }
          ]
        };
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        maxRetries: 3,
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      expect(attempts).toBe(3);
      expect(matrix.elements[0][1].distanceMeters).toBe(3000);
    });

    it('throws RoutingInvalidRequestError immediately on HTTP 400 without looping retries', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        return {
          ok: false,
          status: 400,
          text: async () => 'Bad Request: Invalid waypoints'
        };
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        maxRetries: 3,
        persistentCache: new InMemoryRoutingCache()
      });

      await expect(
        service.getRouteMatrix({
          origins: [pDepot],
          destinations: [pDepot, pA]
        })
      ).rejects.toThrow(RoutingInvalidRequestError);

      expect(attempts).toBe(1); // No retries for 400 Bad Request
    });

    it('throws RoutingQuotaError when 429 retries are exhausted', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 429,
        text: async () => 'Quota exceeded'
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        maxRetries: 2,
        persistentCache: new InMemoryRoutingCache()
      });

      await expect(
        service.getRouteMatrix({
          origins: [pDepot],
          destinations: [pDepot, pA]
        })
      ).rejects.toThrow(RoutingQuotaError);
    });

    it('throws RoutingTimeoutError when fetch times out repeatedly', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        throw err;
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        timeoutMs: 50,
        maxRetries: 1,
        persistentCache: new InMemoryRoutingCache()
      });

      await expect(
        service.getRouteMatrix({
          origins: [pDepot],
          destinations: [pDepot, pA]
        })
      ).rejects.toThrow(RoutingTimeoutError);
    });

    it('throws RoutingUnavailableError on permanent network disconnect', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error('Failed to fetch (DNS / Network down)');
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        maxRetries: 1,
        persistentCache: new InMemoryRoutingCache()
      });

      await expect(
        service.getRouteMatrix({
          origins: [pDepot],
          destinations: [pDepot, pA]
        })
      ).rejects.toThrow(RoutingUnavailableError);
    });
  });

  describe('7. Status Code & Condition Mapping & Malformed Data Handling', () => {
    it('maps Google status codes (NOT_FOUND, ZERO_RESULTS, INVALID_ARGUMENT, UNAVAILABLE) accurately', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          { originIndex: 0, destinationIndex: 0, status: { code: 5 } }, // NOT_FOUND
          { originIndex: 0, destinationIndex: 1, condition: 'ZERO_RESULTS' }, // ZERO_RESULTS
          { originIndex: 1, destinationIndex: 0, status: { code: 3 } }, // INVALID_ARGUMENT
          { originIndex: 1, destinationIndex: 1, status: { code: 14 } } // UNAVAILABLE
        ]
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pA, pB],
        destinations: [pC, pDepot]
      });

      expect(matrix.elements[0][0].status).toBe('NOT_FOUND');
      expect(matrix.elements[0][1].status).toBe('ZERO_RESULTS');
      expect(matrix.elements[1][0].status).toBe('INVALID_ARGUMENT');
      expect(matrix.elements[1][1].status).toBe('UNAVAILABLE');
    });

    it('does not fabricate 0 distance for missing matrix pairs in incomplete response', async () => {
      // Google returns response missing the [0][1] element completely
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => []
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      // Depot -> Depot is 0 OK
      expect(matrix.elements[0][0].status).toBe('OK');
      expect(matrix.elements[0][0].distanceMeters).toBe(0);

      // Depot -> Stop A was missing in Google response: must be UNKNOWN_ERROR, NOT fabricated 0
      expect(matrix.elements[0][1].status).toBe('UNKNOWN_ERROR');
      expect(matrix.elements[0][1].distanceMeters).toBe(0);
    });

    it('handles malformed / non-numeric metrics without producing NaN or undefined', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            originIndex: 0,
            destinationIndex: 1,
            distanceMeters: null,
            duration: 'corrupt_duration_string',
            status: { code: 0 }
          }
        ]
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      const element = matrix.elements[0][1];
      expect(Number.isNaN(element.distanceMeters)).toBe(false);
      expect(Number.isNaN(element.durationSeconds)).toBe(false);
      expect(element.distanceMeters).toBe(0);
      expect(element.durationSeconds).toBe(0);
      expect(element.status).toBe('UNKNOWN_ERROR');
    });

    it('flags UNKNOWN_ERROR when duration is missing or invalid even if distance is valid (preventing fabricated 0 duration)', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            originIndex: 0,
            destinationIndex: 1,
            distanceMeters: 4500,
            duration: 'invalid_duration_format',
            status: { code: 0 }
          }
        ]
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      const element = matrix.elements[0][1];
      expect(element.status).toBe('UNKNOWN_ERROR');
    });
  });

  describe('8. Full Route Calculation Flow', () => {
    it('computes full multi-leg loop route (Depot -> A -> B -> Depot) with legs and polyline', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          routes: [
            {
              distanceMeters: 14200,
              duration: '1850s',
              polyline: { encodedPolyline: 'encoded_poly_depot_a_b_depot' },
              legs: [
                { distanceMeters: 4500, duration: '600s' },
                { distanceMeters: 3800, duration: '500s' },
                { distanceMeters: 5900, duration: '750s' }
              ]
            }
          ]
        })
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const result = await service.calculateRoute({
        origin: pDepot,
        waypoints: [pA, pB],
        destination: pDepot
      });

      expect(result.totalDistanceMeters).toBe(14200);
      expect(result.totalDurationSeconds).toBe(1850);
      expect(result.encodedPolyline).toBe('encoded_poly_depot_a_b_depot');
      expect(result.locationIds).toEqual(['DEPOT', 'STOP_A', 'STOP_B', 'DEPOT']);
      expect(result.legs.length).toBe(3);

      // Verify each leg
      expect(result.legs[0].originId).toBe('DEPOT');
      expect(result.legs[0].destinationId).toBe('STOP_A');
      expect(result.legs[0].distanceMeters).toBe(4500);

      expect(result.legs[1].originId).toBe('STOP_A');
      expect(result.legs[1].destinationId).toBe('STOP_B');
      expect(result.legs[1].distanceMeters).toBe(3800);

      expect(result.legs[2].originId).toBe('STOP_B');
      expect(result.legs[2].destinationId).toBe('DEPOT');
      expect(result.legs[2].distanceMeters).toBe(5900);
    });

    it('verifies return route (Depot -> A and A -> Depot) are independently computed and not mirrored', async () => {
      let requestBody: Record<string, unknown> | null = null;
      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        requestBody = JSON.parse(init.body as string) as Record<string, unknown>;
        const originObj = requestBody.origin as { location?: { latLng?: { latitude?: number } } };
        const isDepotToA = originObj?.location?.latLng?.latitude === pDepot.point.latitude;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            routes: [
              {
                distanceMeters: isDepotToA ? 4500 : 5300,
                duration: isDepotToA ? '600s' : '720s',
                polyline: { encodedPolyline: isDepotToA ? 'poly_forward' : 'poly_return' },
                legs: [{ distanceMeters: isDepotToA ? 4500 : 5300, duration: isDepotToA ? '600s' : '720s' }]
              }
            ]
          })
        };
      });

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const forwardRoute = await service.calculateRoute({ origin: pDepot, destination: pA });
      const returnRoute = await service.calculateRoute({ origin: pA, destination: pDepot });

      expect(forwardRoute.totalDistanceMeters).toBe(4500);
      expect(returnRoute.totalDistanceMeters).toBe(5300);
      expect(forwardRoute.encodedPolyline).toBe('poly_forward');
      expect(returnRoute.encodedPolyline).toBe('poly_return');
    });

    it('ensures metrics come directly from Google response without Haversine synthetic formulas', async () => {
      // Mock returns specific non-Euclidean road distance (e.g. 15 km when straight line is only 2 km)
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          { originIndex: 0, destinationIndex: 1, distanceMeters: 15400, duration: '1800s', status: { code: 0 } }
        ]
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      const matrix = await service.getRouteMatrix({
        origins: [pDepot],
        destinations: [pDepot, pA]
      });

      // Must be exactly what Google provider returned, not geometric Haversine
      expect(matrix.elements[0][1].distanceMeters).toBe(15400);
      expect(matrix.elements[0][1].durationSeconds).toBe(1800);
    });

    it('throws RoutingNoRouteError when computeRoutes returns no valid route', async () => {
      global.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ routes: [] })
      }));

      const service = new GoogleRoutingService({
        apiKey: 'test-key',
        persistentCache: new InMemoryRoutingCache()
      });

      await expect(
        service.calculateRoute({
          origin: pDepot,
          destination: pA
        })
      ).rejects.toThrow(RoutingNoRouteError);
    });
  });
});
