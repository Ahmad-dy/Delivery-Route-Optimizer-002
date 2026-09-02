import { describe, it, expect } from 'vitest';
import { Buyer } from '../../core/domain/entities/Buyer';
import { Driver } from '../../core/domain/entities/Driver';
import { ValidationError } from '../../core/domain/errors/DomainErrors';

describe('Buyer & Driver Entities (Validation & Invariants)', () => {
  describe('Buyer Entity', () => {
    it('creates a valid Buyer with exact required properties', () => {
      const buyer = new Buyer('B-101', 'Al-Mansour Supermarket', 33.3128, 44.3546);
      expect(buyer.buyerCode).toBe('B-101');
      expect(buyer.buyerName).toBe('Al-Mansour Supermarket');
      expect(buyer.latitude).toBe(33.3128);
      expect(buyer.longitude).toBe(44.3546);
    });

    it('rejects empty buyerCode or buyerName', () => {
      expect(() => new Buyer('', 'Name', 33.3, 44.3)).toThrow(ValidationError);
      expect(() => new Buyer('B-1', '', 33.3, 44.3)).toThrow(ValidationError);
    });

    it('rejects invalid geographic coordinates', () => {
      expect(() => new Buyer('B-1', 'Name', 95.0, 44.3)).toThrow(ValidationError);
      expect(() => new Buyer('B-1', 'Name', -91.0, 44.3)).toThrow(ValidationError);
      expect(() => new Buyer('B-1', 'Name', 33.3, 190.0)).toThrow(ValidationError);
      expect(() => new Buyer('B-1', 'Name', 33.3, -181.0)).toThrow(ValidationError);
    });
  });

  describe('Driver Entity', () => {
    it('creates a valid Driver and supports active status immutability', () => {
      const driver = new Driver('D-101', 'Driver One', 1500, true);
      expect(driver.driverId).toBe('D-101');
      expect(driver.maximumLoadKg).toBe(1500);
      expect(driver.active).toBe(true);

      const inactiveDriver = driver.withActiveStatus(false);
      expect(inactiveDriver.active).toBe(false);
      expect(inactiveDriver.driverId).toBe('D-101');
      expect(driver.active).toBe(true); // Original instance unchanged
    });

    it('rejects driver with non-positive nominal payload', () => {
      expect(() => new Driver('D-1', 'Name', 0, true)).toThrow(ValidationError);
      expect(() => new Driver('D-1', 'Name', -500, true)).toThrow(ValidationError);
    });
  });
});
