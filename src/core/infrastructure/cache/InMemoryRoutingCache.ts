import { IRoutingCache, RoutingCacheRecord } from '../../application/ports/IRoutingCache';
import { DEFAULT_ROUTING_CACHE_TTL_MS, ROUTING_CACHE_VERSION } from './IndexedDbRoutingCache';

export class InMemoryRoutingCache implements IRoutingCache {
  private readonly store = new Map<string, RoutingCacheRecord>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_ROUTING_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  public isAvailable(): boolean {
    return true;
  }

  public async get(key: string): Promise<RoutingCacheRecord | null> {
    const record = this.store.get(key);
    if (!record) return null;

    if (record.version !== ROUTING_CACHE_VERSION) {
      this.store.delete(key);
      return null;
    }

    if (Date.now() - record.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return record;
  }

  public async set(key: string, record: RoutingCacheRecord): Promise<void> {
    this.store.set(key, { ...record, key });
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }
}
