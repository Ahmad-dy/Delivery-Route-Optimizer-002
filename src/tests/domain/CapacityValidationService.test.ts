import { describe, it, expect } from 'vitest';
import { CapacityValidationService } from '../../core/domain/services/CapacityValidationService';
import { Driver } from '../../core/domain/entities/Driver';

describe('CapacityValidationService', () => {
  const activeDriver1 = new Driver('D1', 'Driver One', 1000, true); // max = 1100
  const activeDriver2 = new Driver('D2', 'Driver Two', 2000, true); // max = 2200
  const inactiveDriver = new Driver('D3', 'Driver Three', 5000, false); // inactive

  it('should find the largest operational capacity among ACTIVE drivers only', () => {
    const result = CapacityValidationService.evaluateFleetCapacity([
      activeDriver1,
      activeDriver2,
      inactiveDriver
    ]);

    expect(result.hasActiveDrivers).toBe(true);
    expect(result.activeDriverCount).toBe(2);
    // Driver 2 is active with 2000kg -> maxAllowed is 2200kg (110%)
    expect(result.maxActiveDriverCapacityKg).toBe(2200);
  });

  it('should identify oversized stops exceeding the maximum active driver capacity', () => {
    const maxCapacity = 2200;

    const normalStopWeight = 1500;
    const oversizedStopWeight = 2500;

    expect(CapacityValidationService.isStopOversized(normalStopWeight, maxCapacity)).toBe(false);
    expect(CapacityValidationService.isStopOversized(oversizedStopWeight, maxCapacity)).toBe(true);
  });

  it('should handle fleet with zero active drivers gracefully', () => {
    const result = CapacityValidationService.evaluateFleetCapacity([inactiveDriver]);

    expect(result.hasActiveDrivers).toBe(false);
    expect(result.activeDriverCount).toBe(0);
    expect(result.maxActiveDriverCapacityKg).toBe(0);
  });
});
