import { Driver } from '../entities/Driver';

export interface CapacityEvaluationResult {
  readonly hasActiveDrivers: boolean;
  readonly activeDriverCount: number;
  readonly maxActiveDriverCapacityKg: number;
  readonly activeDriversSummary: readonly {
    readonly driverId: string;
    readonly driverName: string;
    readonly nominalCapacityKg: number;
    readonly maxAllowedCapacityKg: number;
  }[];
}

export class CapacityValidationService {
  /**
   * Calculates fleet capacity ceilings for active drivers (+10% operational buffer).
   */
  public static evaluateFleetCapacity(drivers: readonly Driver[]): CapacityEvaluationResult {
    const activeDrivers = drivers.filter(d => d.active);

    if (activeDrivers.length === 0) {
      return {
        hasActiveDrivers: false,
        activeDriverCount: 0,
        maxActiveDriverCapacityKg: 0,
        activeDriversSummary: []
      };
    }

    const summaries = activeDrivers.map(d => ({
      driverId: d.driverId,
      driverName: d.driverName,
      nominalCapacityKg: d.maximumLoadKg,
      maxAllowedCapacityKg: d.maximumAllowedLoadKg
    }));

    const maxCapacity = Math.max(...summaries.map(s => s.maxAllowedCapacityKg));

    return {
      hasActiveDrivers: true,
      activeDriverCount: activeDrivers.length,
      maxActiveDriverCapacityKg: maxCapacity > 0 ? maxCapacity : 0,
      activeDriversSummary: Object.freeze(summaries)
    };
  }

  /**
   * Checks if a stop weight exceeds the largest operational capacity among active drivers.
   */
  public static isStopOversized(stopWeightKg: number, maxActiveCapacityKg: number): boolean {
    if (maxActiveCapacityKg <= 0) return false;
    return stopWeightKg > maxActiveCapacityKg;
  }
}
