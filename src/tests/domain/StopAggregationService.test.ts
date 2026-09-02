import { describe, it, expect } from 'vitest';
import { StopAggregationService } from '../../core/domain/services/StopAggregationService';
import { DeliveryList } from '../../core/domain/entities/DeliveryList';
import { Buyer } from '../../core/domain/entities/Buyer';
import { ValidationError } from '../../core/domain/errors/DomainErrors';

describe('StopAggregationService', () => {
  const buyer1 = new Buyer('B001', 'Al-Amal Market', 33.3152, 44.3661);
  const buyer2 = new Buyer('B002', 'Baghdad Supermarket', 33.3250, 44.3700);

  it('should group multiple delivery lists for the same buyer into a single atomic stop with authoritative GPS', () => {
    const list1 = new DeliveryList('L-101', 'B001', 'Al-Amal Market', 50);
    const list2 = new DeliveryList('L-102', 'B001', 'Al-Amal Market', 75);
    const list3 = new DeliveryList('L-103', 'B002', 'Baghdad Supermarket', 120);

    const buyerMap = new Map<string, Buyer>([
      ['B001', buyer1],
      ['B002', buyer2]
    ]);

    const stops = StopAggregationService.aggregate([list1, list2, list3], buyerMap);

    expect(stops).toHaveLength(2);

    const stop1 = stops.find(s => s.buyerCode === 'B001');
    expect(stop1).toBeDefined();
    expect(stop1?.lists).toHaveLength(2);
    expect(stop1?.totalWeightKg).toBe(125);
    expect(stop1?.latitude).toBe(33.3152);
    expect(stop1?.longitude).toBe(44.3661);
    expect(stop1?.hasValidGps).toBe(true);

    const stop2 = stops.find(s => s.buyerCode === 'B002');
    expect(stop2).toBeDefined();
    expect(stop2?.lists).toHaveLength(1);
    expect(stop2?.totalWeightKg).toBe(120);
    expect(stop2?.latitude).toBe(33.3250);
    expect(stop2?.longitude).toBe(44.3700);
    expect(stop2?.hasValidGps).toBe(true);
  });

  it('should THROW ValidationError when buyer is missing from registry (never creates stop at 0, 0)', () => {
    const list = new DeliveryList('L-201', 'B003', 'Unknown Shop', 60);
    const emptyBuyerMap = new Map<string, Buyer>();

    expect(() => {
      StopAggregationService.aggregate([list], emptyBuyerMap);
    }).toThrow(ValidationError);
  });

  it('should THROW ValidationError when buyer has invalid GPS coordinates (0, 0)', () => {
    const buyerZeroGps = new Buyer('B_ZERO', 'Zero Island Store', 0, 0);
    const list = new DeliveryList('L-301', 'B_ZERO', 'Zero Island Store', 100);

    const buyerMap = new Map<string, Buyer>([
      ['B_ZERO', buyerZeroGps]
    ]);

    expect(() => {
      StopAggregationService.aggregate([list], buyerMap);
    }).toThrow(ValidationError);
  });
});
