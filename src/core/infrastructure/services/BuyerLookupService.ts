import { Buyer } from '../../domain/entities/Buyer';
import { BuyerRepository } from '../../application/ports/BuyerRepository';
import { IBuyerLookupService, BuyerLookupResult } from '../../application/ports/IBuyerLookupService';
import { RepositoryError } from '../../domain/errors/DomainErrors';

export class BuyerLookupService implements IBuyerLookupService {
  private readonly buyerRepo: BuyerRepository;
  private readonly cache: Map<string, Buyer> = new Map();

  constructor(buyerRepo: BuyerRepository) {
    this.buyerRepo = buyerRepo;
  }

  public async lookupBuyers(buyerCodes: readonly string[]): Promise<BuyerLookupResult> {
    const uniqueCodes = Array.from(new Set(buyerCodes.map(c => c.trim()))).filter(c => c.length > 0);
    const resultMap = new Map<string, Buyer>();
    const codesToFetch: string[] = [];

    // Check in-memory cache first
    for (const code of uniqueCodes) {
      if (this.cache.has(code)) {
        resultMap.set(code, this.cache.get(code)!);
      } else {
        codesToFetch.push(code);
      }
    }

    if (codesToFetch.length > 0) {
      try {
        // Fetch missing buyers in a single batch query call
        const fetchedBuyers = await this.buyerRepo.getByCodes(codesToFetch);

        for (const buyer of fetchedBuyers) {
          this.cache.set(buyer.buyerCode, buyer);
          resultMap.set(buyer.buyerCode, buyer);
        }
      } catch (error) {
        throw new RepositoryError(
          `Failed to lookup buyers from Firebase repository: ${error instanceof Error ? error.message : String(error)}`,
          { error: String(error) }
        );
      }
    }

    const missingCodes: string[] = [];
    for (const code of uniqueCodes) {
      if (!resultMap.has(code)) {
        missingCodes.push(code);
      }
    }

    return {
      buyers: resultMap,
      missingCodes: Object.freeze(missingCodes)
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
