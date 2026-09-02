import { describe, it, expect } from 'vitest';
import { Capacity } from '../../core/domain/value-objects/Capacity';
import { Driver } from '../../core/domain/entities/Driver';
import { CapacityDomainService } from '../../core/domain/services/CapacityDomainService';
import { ValidationDomainService } from '../../core/domain/services/ValidationDomainService';
import { CapacityExceededError } from '../../core/domain/errors/DomainErrors';

describe('Capacity Value Object & Domain Service (110% Rule)', () => {
  it('calculates maximum allowed capacity with exact 110% formula', () => {
    expect(Capacity.calculateMaximumAllowed(1000)).toBe(1100);
    expect(Capacity.calculateMaximumAllowed(1500)).toBe(1650);
    expect(Capacity.calculateMaximumAllowed(2000)).toBe(2200);
  });

  it('correctly evaluates capacity tolerance boundary', () => {
    const nominal = 1000;
    const capacity = new Capacity(nominal);

    expect(capacity.canAccommodate(500)).toBe(true);
    expect(capacity.canAccommodate(1000)).toBe(true);
    expect(capacity.canAccommodate(1100)).toBe(true); // Exact 110% boundary
    expect(capacity.canAccommodate(1100.01)).toBe(false); // Exceeds 110%
    expect(capacity.canAccommodate(1200)).toBe(false);
  });

  it('calculates utilization percent against nominal capacity', () => {
    const nominal = 1000;
    expect(Capacity.calculateUtilizationPercent(500, nominal)).toBe(50);
    expect(Capacity.calculateUtilizationPercent(1000, nominal)).toBe(100);
    expect(Capacity.calculateUtilizationPercent(1100, nominal)).toBe(110);
  });

  it('enforces 110% capacity per driver independently', () => {
    const smallDriver = new Driver('D1', 'Driver Small', 1000, true);
    const largeDriver = new Driver('D2', 'Driver Large', 2000, true);

    expect(CapacityDomainService.getMaximumAllowedCapacity(smallDriver)).toBe(1100);
    expect(CapacityDomainService.getMaximumAllowedCapacity(largeDriver)).toBe(2200);

    expect(CapacityDomainService.canAssignWeight(smallDriver, 1100)).toBe(true);
    expect(CapacityDomainService.canAssignWeight(smallDriver, 1105)).toBe(false);

    expect(CapacityDomainService.canAssignWeight(largeDriver, 2150)).toBe(true);
    expect(CapacityDomainService.canAssignWeight(largeDriver, 2250)).toBe(false);
  });

  it('throws CapacityExceededError when assigned weight violates 110% limit', () => {
    const driver = new Driver('D-TEST', 'Test Driver', 1000, true);

    expect(() => {
      ValidationDomainService.validateDriverCapacity(driver, 1150);
    }).toThrow(CapacityExceededError);
  });

  it('calculates fleet nominal and max capacities across active drivers only', () => {
    const drivers = [
      new Driver('D1', 'Driver 1', 1000, true),
      new Driver('D2', 'Driver 2', 2000, true),
      new Driver('D3', 'Driver 3 (Inactive)', 1500, false) // Should be excluded
    ];

    expect(CapacityDomainService.calculateFleetNominalCapacity(drivers)).toBe(3000);
    expect(CapacityDomainService.calculateFleetMaxAllowedCapacity(drivers)).toBe(3300);
  });
});
