import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryRoutingCache } from '../../core/infrastructure/cache/InMemoryRoutingCache';
import { IndexedDbRoutingCache, ROUTING_CACHE_VERSION } from '../../core/infrastructure/cache/IndexedDbRoutingCache';
import { RoutingCacheRecord } from '../../core/application/ports/IRoutingCache';

describe('Stage 4 Hardening: Routing Cache Layer', () => {
  describe('InMemoryRoutingCache', () => {
    let cache: InMemoryRoutingCache;

    beforeEach(() => {
      cache = new InMemoryRoutingCache(1000); // 1 second TTL
    });

    it('sets and retrieves routing cache record successfully', async () => {
      const record: RoutingCacheRecord = {
        key: '33.315200,44.366100->33.312800,44.354600|DRIVE|TRAFFIC_UNAWARE|v1',
        distanceMeters: 4500,
        durationSeconds: 620,
        status: 'OK',
        timestamp: Date.now(),
        version: ROUTING_CACHE_VERSION,
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      await cache.set(record.key, record);
      const retrieved = await cache.get(record.key);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.distanceMeters).toBe(4500);
      expect(retrieved?.durationSeconds).toBe(620);
      expect(retrieved?.status).toBe('OK');
      expect(retrieved?.version).toBe('v1');
    });

    it('invalidates and removes entry when TTL expires', async () => {
      const expiredRecord: RoutingCacheRecord = {
        key: 'test_expired_key',
        distanceMeters: 1000,
        durationSeconds: 120,
        status: 'OK',
        timestamp: Date.now() - 2000, // 2 seconds ago (TTL is 1 second)
        version: ROUTING_CACHE_VERSION,
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      await cache.set(expiredRecord.key, expiredRecord);
      const result = await cache.get(expiredRecord.key);

      expect(result).toBeNull();
    });

    it('invalidates and removes entry when cache version is incompatible', async () => {
      const oldVersionRecord: RoutingCacheRecord = {
        key: 'test_old_v0_key',
        distanceMeters: 2000,
        durationSeconds: 300,
        status: 'OK',
        timestamp: Date.now(),
        version: 'v0_legacy',
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      await cache.set(oldVersionRecord.key, oldVersionRecord);
      const result = await cache.get(oldVersionRecord.key);

      expect(result).toBeNull();
    });

    it('deletes specific cache record', async () => {
      const record: RoutingCacheRecord = {
        key: 'test_delete_key',
        distanceMeters: 500,
        durationSeconds: 60,
        status: 'OK',
        timestamp: Date.now(),
        version: ROUTING_CACHE_VERSION,
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      await cache.set(record.key, record);
      expect(await cache.get(record.key)).not.toBeNull();

      await cache.delete(record.key);
      expect(await cache.get(record.key)).toBeNull();
    });

    it('clears all cached entries', async () => {
      const r1: RoutingCacheRecord = {
        key: 'k1',
        distanceMeters: 100,
        durationSeconds: 10,
        status: 'OK',
        timestamp: Date.now(),
        version: ROUTING_CACHE_VERSION,
        routingPreference: 'TRAFFIC_UNAWARE'
      };
      const r2: RoutingCacheRecord = {
        key: 'k2',
        distanceMeters: 200,
        durationSeconds: 20,
        status: 'OK',
        timestamp: Date.now(),
        version: ROUTING_CACHE_VERSION,
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      await cache.set(r1.key, r1);
      await cache.set(r2.key, r2);

      await cache.clear();

      expect(await cache.get(r1.key)).toBeNull();
      expect(await cache.get(r2.key)).toBeNull();
    });
  });

  describe('IndexedDbRoutingCache fallback in non-browser / unavailable environments', () => {
    it('safely handles missing window.indexedDB gracefully without throwing', async () => {
      // In Node.js / Vitest environment, window.indexedDB might be undefined
      const idbCache = new IndexedDbRoutingCache('TestDB', 'test_store');

      // Operations should not throw
      const getRes = await idbCache.get('non_existent_key');
      expect(getRes).toBeNull();

      await expect(
        idbCache.set('key1', {
          key: 'key1',
          distanceMeters: 1000,
          durationSeconds: 100,
          status: 'OK',
          timestamp: Date.now(),
          version: ROUTING_CACHE_VERSION,
          routingPreference: 'TRAFFIC_UNAWARE'
        })
      ).resolves.not.toThrow();

      await expect(idbCache.delete('key1')).resolves.not.toThrow();
      await expect(idbCache.clear()).resolves.not.toThrow();
    });
  });
});
