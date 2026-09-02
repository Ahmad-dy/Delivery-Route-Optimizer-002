import { describe, it, expect } from 'vitest';
import { DeliveryList } from '../../core/domain/entities/DeliveryList';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';
import { ValidationDomainService } from '../../core/domain/services/ValidationDomainService';
import { DuplicateListError, ValidationError } from '../../core/domain/errors/DomainErrors';

describe('Delivery List & Stop Invariants (Single Physical Stop per Buyer)', () => {
  it('creates valid delivery list and validates properties', () => {
    const list = new DeliveryList('L-001', 'B-101', 'Buyer One', 250.5);
    expect(list.listNumber).toBe('L-001');
    expect(list.buyerCode).toBe('B-101');
    expect(list.weightKg).toBe(250.5);
  });

  it('aggregates multiple delivery lists for the same buyer into a single physical stop', () => {
    const list1 = new DeliveryList('L-101', 'B-101', 'Buyer One', 150);
    const list2 = new DeliveryList('L-102', 'B-101', 'Buyer One', 350.75);

    const stop = new DeliveryStop('STOP-B101', 'B-101', 'Buyer One', 33.3128, 44.3546, [list1, list2]);

    expect(stop.lists.length).toBe(2);
    expect(stop.totalWeightKg).toBe(500.75); // 150 + 350.75
    expect(stop.buyerCode).toBe('B-101');
  });

  it('rejects aggregation of lists belonging to different buyers in one stop', () => {
    const list1 = new DeliveryList('L-101', 'B-101', 'Buyer One', 150);
    const list2 = new DeliveryList('L-102', 'B-102', 'Buyer Two', 200);

    expect(() => {
      new DeliveryStop('STOP-INVALID', 'B-101', 'Buyer One', 33.3128, 44.3546, [list1, list2]);
    }).toThrow(ValidationError);
  });

  it('rejects stops with empty lists array', () => {
    expect(() => {
      new DeliveryStop('STOP-EMPTY', 'B-101', 'Buyer One', 33.3128, 44.3546, []);
    }).toThrow(ValidationError);
  });

  it('detects duplicate list numbers in a delivery batch', () => {
    const batch = [
      { listNumber: 'L-101', buyerCode: 'B-101', buyerName: 'Buyer 1', weightKg: 100 },
      { listNumber: 'L-102', buyerCode: 'B-102', buyerName: 'Buyer 2', weightKg: 200 },
      { listNumber: 'L-101', buyerCode: 'B-103', buyerName: 'Buyer 3', weightKg: 150 } // Duplicate L-101
    ];

    expect(() => {
      ValidationDomainService.validateListBatch(batch);
    }).toThrow(DuplicateListError);
  });
});
