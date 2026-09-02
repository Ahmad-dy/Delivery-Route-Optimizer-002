import { MatrixElementStatus } from './IRoutingService';

export interface RoutingCacheRecord {
  readonly key: string;
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly status: MatrixElementStatus;
  readonly timestamp: number;
  readonly version: string;
  readonly routingPreference: string;
}

export interface IRoutingCache {
  /**
   * Retrieves a record from the persistent cache by key.
   * Returns null if not found or expired.
   */
  get(key: string): Promise<RoutingCacheRecord | null>;

  /**
   * Persists a routing record into the persistent cache.
   */
  set(key: string, record: RoutingCacheRecord): Promise<void>;

  /**
   * Deletes a specific record by key.
   */
  delete(key: string): Promise<void>;

  /**
   * Clears all entries from the persistent cache.
   */
  clear(): Promise<void>;

  /**
   * Returns true if the storage mechanism is active and available in the current environment.
   */
  isAvailable(): boolean;
}
