import { describe, it, expect } from 'vitest';
import { ImportDeliveryExcelUseCase } from '../../core/application/use-cases/import/ImportDeliveryExcelUseCase';
import { IExcelParser, RawExcelSheet } from '../../core/application/ports/IExcelParser';
import { IBuyerLookupService, BuyerLookupResult } from '../../core/application/ports/IBuyerLookupService';
import { DriverRepository } from '../../core/application/ports/DriverRepository';
import { Buyer } from '../../core/domain/entities/Buyer';
import { Driver } from '../../core/domain/entities/Driver';

class MockExcelParser implements IExcelParser {
  public sheetToReturn: RawExcelSheet = {
    fileName: 'test.xlsx',
    fileSize: 1024,
    headers: ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'],
    rows: [],
    totalRowCount: 0
  };

  async parse(_fileBuffer: ArrayBuffer, _fileName: string, _fileSize: number): Promise<RawExcelSheet> {
    return this.sheetToReturn;
  }
}

class MockBuyerLookupService implements IBuyerLookupService {
  public buyersMap = new Map<string, Buyer>();

  async lookupBuyers(buyerCodes: readonly string[]): Promise<BuyerLookupResult> {
    const found = new Map<string, Buyer>();
    const missing: string[] = [];

    for (const code of buyerCodes) {
      const b = this.buyersMap.get(code);
      if (b) {
        found.set(code, b);
      } else {
        missing.push(code);
      }
    }

    return {
      buyers: found,
      missingCodes: missing
    };
  }
}

class MockDriverRepository implements DriverRepository {
  public drivers: Driver[] = [];
  async getAll(): Promise<readonly Driver[]> { return this.drivers; }
  async getById(driverId: string): Promise<Driver | null> { return this.drivers.find(d => d.driverId === driverId) || null; }
  async create(driver: Driver): Promise<void> { this.drivers.push(driver); }
  async update(driver: Driver): Promise<void> {
    const idx = this.drivers.findIndex(d => d.driverId === driver.driverId);
    if (idx >= 0) this.drivers[idx] = driver;
  }
  async delete(driverId: string): Promise<void> {
    this.drivers = this.drivers.filter(d => d.driverId !== driverId);
  }
  async setActive(driverId: string, active: boolean): Promise<void> {
    const d = this.drivers.find(item => item.driverId === driverId);
    if (d) {
      const idx = this.drivers.indexOf(d);
      this.drivers[idx] = d.withActiveStatus(active);
    }
  }
}

describe('ImportDeliveryExcelUseCase', () => {
  const parser = new MockExcelParser();
  const lookup = new MockBuyerLookupService();
  const driverRepo = new MockDriverRepository();
  const useCase = new ImportDeliveryExcelUseCase(parser, lookup, driverRepo);

  const buyer1 = new Buyer('B001', 'Al-Amal Market', 33.3152, 44.3661);
  const buyer2 = new Buyer('B002', 'Baghdad Supermarket', 33.3250, 44.3700);

  it('should successfully parse valid Excel rows and match buyers', async () => {
    lookup.buyersMap.set('B001', buyer1);
    lookup.buyersMap.set('B002', buyer2);
    driverRepo.drivers = [new Driver('D1', 'Driver A', 2000, true)];

    parser.sheetToReturn = {
      fileName: 'test.xlsx',
      fileSize: 1024,
      headers: ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'],
      rows: [
        { rowNumber: 2, raw: { 'List Number': 'L-101', 'Buyer Code': 'B001', 'Buyer Name': 'Al-Amal Market', 'Weight': 100 } },
        { rowNumber: 3, raw: { 'List Number': 'L-102', 'Buyer Code': 'B001', 'Buyer Name': 'Al-Amal Market', 'Weight': 150 } },
        { rowNumber: 4, raw: { 'List Number': 'L-103', 'Buyer Code': 'B002', 'Buyer Name': 'Baghdad Supermarket', 'Weight': 300 } }
      ],
      totalRowCount: 3
    };

    const result = await useCase.execute(new ArrayBuffer(100), 'test.xlsx', 1024);

    expect(result.status).toBe('READY');
    expect(result.errors).toHaveLength(0);
    expect(result.lists).toHaveLength(3);
    expect(result.stops).toHaveLength(2);
    expect(result.summary.validLists).toBe(3);
    expect(result.summary.totalWeightKg).toBe(550);
  });

  it('should generate blocking error for duplicate list numbers across rows', async () => {
    lookup.buyersMap.set('B001', buyer1);
    parser.sheetToReturn = {
      fileName: 'dup.xlsx',
      fileSize: 1024,
      headers: ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'],
      rows: [
        { rowNumber: 2, raw: { 'List Number': 'L-DUP', 'Buyer Code': 'B001', 'Buyer Name': 'Al-Amal Market', 'Weight': 100 } },
        { rowNumber: 3, raw: { 'List Number': 'L-DUP', 'Buyer Code': 'B001', 'Buyer Name': 'Al-Amal Market', 'Weight': 150 } }
      ],
      totalRowCount: 2
    };

    const result = await useCase.execute(new ArrayBuffer(100), 'dup.xlsx', 1024);

    expect(result.status).toBe('BLOCKING_ERRORS');
    expect(result.errors.some(e => e.errorCode === 'DUPLICATE_LIST_NUMBER')).toBe(true);
  });

  it('should generate blocking error for missing buyer in master registry', async () => {
    lookup.buyersMap.clear(); // Empty database
    parser.sheetToReturn = {
      fileName: 'unknown.xlsx',
      fileSize: 1024,
      headers: ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'],
      rows: [
        { rowNumber: 2, raw: { 'List Number': 'L-101', 'Buyer Code': 'B_UNKNOWN', 'Buyer Name': 'Unknown Store', 'Weight': 100 } }
      ],
      totalRowCount: 1
    };

    const result = await useCase.execute(new ArrayBuffer(100), 'unknown.xlsx', 1024);

    expect(result.status).toBe('BLOCKING_ERRORS');
    expect(result.errors.some(e => e.errorCode === 'BUYER_NOT_FOUND')).toBe(true);
  });

  it('should generate warning for buyer name mismatch and flag oversized stops', async () => {
    lookup.buyersMap.set('B001', buyer1);
    driverRepo.drivers = [new Driver('D1', 'Driver A', 500, true)]; // max capacity = 550kg

    parser.sheetToReturn = {
      fileName: 'warn.xlsx',
      fileSize: 1024,
      headers: ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'],
      rows: [
        { rowNumber: 2, raw: { 'List Number': 'L-101', 'Buyer Code': 'B001', 'Buyer Name': 'Different Name in Excel', 'Weight': 800 } }
      ],
      totalRowCount: 1
    };

    const result = await useCase.execute(new ArrayBuffer(100), 'warn.xlsx', 1024);

    expect(result.status).toBe('READY'); // non-blocking
    expect(result.warnings.some(w => w.warningCode === 'BUYER_NAME_MISMATCH')).toBe(true);
    expect(result.warnings.some(w => w.warningCode === 'OVERSIZED_STOP')).toBe(true);
    expect(result.stops[0].isOversized).toBe(true);
  });
});
