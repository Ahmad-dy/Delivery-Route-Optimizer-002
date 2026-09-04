import { Driver } from '../entities/Driver';
import { Capacity } from '../value-objects/Capacity';

export class CapacityDomainService {
  /**
   * Returns the hard 110% maximum capacity limit for a driver
   */
  public static getMaximumAllowedCapacity(driver: Driver): number {
    return Capacity.calculateMaximumAllowed(driver.maximumLoadKg);
  }

  /**
   * Calculates the 110% operational ceiling for a nominal capacity
   */
  public static calculateOperationalLimit(nominalCapacityKg: number): number {
    return Capacity.calculateMaximumAllowed(nominalCapacityKg);
  }

  /**
   * Evaluates if a driver can accommodate a given total cargo weight
   */
  public static canAssignWeight(driver: Driver, weightKg: number): boolean {
    const maxAllowed = Capacity.calculateMaximumAllowed(driver.maximumLoadKg);
    return weightKg <= maxAllowed;
  }

  /**
   * Calculates utilization percentage against driver's nominal capacity:
   * (assignedWeightKg / nominalLoadKg) * 100
   */
  public static getUtilization(driver: Driver, assignedWeightKg: number): number {
    return Capacity.calculateUtilizationPercent(assignedWeightKg, driver.maximumLoadKg);
  }

  /**
   * Calculates total fleet nominal capacity across active drivers
   */
  public static calculateFleetNominalCapacity(drivers: readonly Driver[]): number {
    const activeDrivers = drivers.filter(d => d.active);
    const sum = activeDrivers.reduce((acc, d) => acc + d.maximumLoadKg, 0);
    return Math.round(sum * 100) / 100;
  }

  /**
   * Calculates total fleet maximum allowed capacity (sum of 110% of each active driver)
   */
  public static calculateFleetMaxAllowedCapacity(drivers: readonly Driver[]): number {
    const activeDrivers = drivers.filter(d => d.active);
    const sum = activeDrivers.reduce((acc, d) => acc + Capacity.calculateMaximumAllowed(d.maximumLoadKg), 0);
    return Math.round(sum * 100) / 100;
  }
}
