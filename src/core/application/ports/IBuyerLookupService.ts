import { Buyer } from '../../domain/entities/Buyer';

export interface BuyerLookupResult {
  readonly buyers: ReadonlyMap<string, Buyer>;
  readonly missingCodes: readonly string[];
}

export interface IBuyerLookupService {
  /**
   * Looks up multiple buyers by their unique codes in an efficient, deduplicated manner.
   * Leverages caching/batch queries to avoid repeated Firebase reads.
   * Distinguishes between missing buyers and database unavailability.
   */
  lookupBuyers(buyerCodes: readonly string[]): Promise<BuyerLookupResult>;
}
