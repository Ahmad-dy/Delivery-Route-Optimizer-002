import { IRoutingCache, RoutingCacheRecord } from '../../application/ports/IRoutingCache';

export const DEFAULT_ROUTING_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ROUTING_CACHE_VERSION = 'v1';
export const COORDINATE_PRECISION = 6;

export class IndexedDbRoutingCache implements IRoutingCache {
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly ttlMs: number;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private available = false;

  constructor(
    dbName = 'DeliveryRouterCacheDB',
    storeName = 'routes_matrix_cache',
    ttlMs: number = DEFAULT_ROUTING_CACHE_TTL_MS
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.ttlMs = ttlMs;
    this.available = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
    } catch {
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.available;
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (!this.available) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = window.indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = () => {
          this.available = false;
          resolve(null);
        };

        request.onblocked = () => {
          resolve(null);
        };
      } catch {
        this.available = false;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async get(key: string): Promise<RoutingCacheRecord | null> {
    const db = await this.getDb();
    if (!db) return null;

    return new Promise<RoutingCacheRecord | null>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const record = request.result as RoutingCacheRecord | undefined;
          if (!record) {
            resolve(null);
            return;
          }

          // Validate version
          if (record.version !== ROUTING_CACHE_VERSION) {
            this.delete(key).catch(() => {});
            resolve(null);
            return;
          }

          // Validate TTL
          const now = Date.now();
          if (now - record.timestamp > this.ttlMs) {
            this.delete(key).catch(() => {});
            resolve(null);
            return;
          }

          resolve(record);
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  public async set(key: string, record: RoutingCacheRecord): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.put({ ...record, key });

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async delete(key: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async clear(): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}
