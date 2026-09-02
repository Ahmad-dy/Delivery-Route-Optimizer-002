import { describe, it, expect, vi } from 'vitest';
import { BuyerLookupService } from '../../core/infrastructure/services/BuyerLookupService';
import { BuyerRepository } from '../../core/application/ports/BuyerRepository';
import { Buyer } from '../../core/domain/entities/Buyer';
import { RepositoryError } from '../../core/domain/errors/DomainErrors';
import { FirestoreBuyerRepository } from '../../core/infrastructure/repositories/FirestoreBuyerRepository';

class MockBatchBuyerRepository implements BuyerRepository {
  public getByCodesCallCount = 0;
  public lastRequestedCodes: readonly string[] = [];
  public buyersStore = new Map<string, Buyer>();
  public shouldFail = false;

  async getByCode(buyerCode: string): Promise<Buyer | null> {
    if (this.shouldFail) throw new Error('Firestore connection timeout');
    return this.buyersStore.get(buyerCode) || null;
  }

  async getByCodes(buyerCodes: readonly string[]): Promise<readonly Buyer[]> {
    this.getByCodesCallCount++;
    this.lastRequestedCodes = buyerCodes;
    if (this.shouldFail) throw new Error('Firestore connection timeout');

    const found: Buyer[] = [];
    for (const code of buyerCodes) {
      const b = this.buyersStore.get(code);
      if (b) found.push(b);
    }
    return found;
  }

  async getAll(): Promise<readonly Buyer[]> { return Array.from(this.buyersStore.values()); }
  async create(buyer: Buyer): Promise<void> { this.buyersStore.set(buyer.buyerCode, buyer); }
  async update(buyer: Buyer): Promise<void> { this.buyersStore.set(buyer.buyerCode, buyer); }
  async delete(buyerCode: string): Promise<void> { this.buyersStore.delete(buyerCode); }
  async exists(buyerCode: string): Promise<boolean> { return this.buyersStore.has(buyerCode); }
}

describe('BuyerLookupService & Batch Querying', () => {
  const buyerA = new Buyer('B001', 'Al-Amal Market', 33.3152, 44.3661);
  const buyerB = new Buyer('B002', 'Baghdad Central', 33.3250, 44.3700);
  const buyerC = new Buyer('B003', 'Dijlah Store', 33.3350, 44.3800);

  it('should deduplicate repeating buyer codes and execute exactly ONE batch repository call', async () => {
    const repo = new MockBatchBuyerRepository();
    repo.buyersStore.set('B001', buyerA);
    const service = new BuyerLookupService(repo);

    // 20 repeated references to B001
    const repeatedCodes = Array(20).fill('B001');
    const result = await service.lookupBuyers(repeatedCodes);

    expect(repo.getByCodesCallCount).toBe(1);
    expect(repo.lastRequestedCodes).toHaveLength(1);
    expect(repo.lastRequestedCodes[0]).toBe('B001');
    expect(result.buyers.size).toBe(1);
    expect(result.buyers.get('B001')).toBe(buyerA);
    expect(result.missingCodes).toHaveLength(0);
  });

  it('should return empty result without querying repository for empty input', async () => {
    const repo = new MockBatchBuyerRepository();
    const service = new BuyerLookupService(repo);

    const result = await service.lookupBuyers([]);

    expect(repo.getByCodesCallCount).toBe(0);
    expect(result.buyers.size).toBe(0);
    expect(result.missingCodes).toHaveLength(0);
  });

  it('should accurately distinguish found buyers from missing buyer codes', async () => {
    const repo = new MockBatchBuyerRepository();
    repo.buyersStore.set('B001', buyerA);
    repo.buyersStore.set('B002', buyerB);
    // B099 is missing
    const service = new BuyerLookupService(repo);

    const result = await service.lookupBuyers(['B001', 'B002', 'B099']);

    expect(repo.getByCodesCallCount).toBe(1);
    expect(result.buyers.size).toBe(2);
    expect(result.buyers.get('B001')?.buyerName).toBe('Al-Amal Market');
    expect(result.buyers.get('B002')?.buyerName).toBe('Baghdad Central');
    expect(result.missingCodes).toContain('B099');
    expect(result.missingCodes).toHaveLength(1);
  });

  it('should utilize cache on subsequent lookups and not query repository again', async () => {
    const repo = new MockBatchBuyerRepository();
    repo.buyersStore.set('B001', buyerA);
    repo.buyersStore.set('B002', buyerB);
    repo.buyersStore.set('B003', buyerC);
    const service = new BuyerLookupService(repo);

    // First lookup: B001, B002
    await service.lookupBuyers(['B001', 'B002']);
    expect(repo.getByCodesCallCount).toBe(1);

    // Second lookup: B001 (cached), B003 (new)
    const result2 = await service.lookupBuyers(['B001', 'B003']);
    expect(repo.getByCodesCallCount).toBe(2);
    expect(repo.lastRequestedCodes).toEqual(['B003']); // Only B003 fetched
    expect(result2.buyers.size).toBe(2);
    expect(result2.buyers.get('B001')).toBe(buyerA);
    expect(result2.buyers.get('B003')).toBe(buyerC);
  });

  it('should throw RepositoryError when Firestore operation fails', async () => {
    const repo = new MockBatchBuyerRepository();
    repo.shouldFail = true;
    const service = new BuyerLookupService(repo);

    await expect(service.lookupBuyers(['B001'])).rejects.toThrow(RepositoryError);
  });

  it('should verify Firestore chunking constant limit is 30', () => {
    expect(FirestoreBuyerRepository.FIRESTORE_IN_BATCH_LIMIT).toBe(30);

    // 75 unique codes split into chunks of 30 results in 3 chunks: [30, 30, 15]
    const testCodes = Array.from({ length: 75 }, (_, i) => `B${String(i).padStart(3, '0')}`);
    const chunkSize = FirestoreBuyerRepository.FIRESTORE_IN_BATCH_LIMIT;
    const chunks: string[][] = [];
    for (let i = 0; i < testCodes.length; i += chunkSize) {
      chunks.push(testCodes.slice(i, i + chunkSize));
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(30);
    expect(chunks[1]).toHaveLength(30);
    expect(chunks[2]).toHaveLength(15);
  });
});
