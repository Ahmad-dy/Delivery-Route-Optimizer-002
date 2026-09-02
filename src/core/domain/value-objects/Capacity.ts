import { ValidationError, CapacityExceededError } from '../errors/DomainErrors';

export class Capacity {
  public static readonly CAPACITY_TOLERANCE_MULTIPLIER = 1.10; // 110% hard operational limit

  public readonly nominalKg: number;
  public readonly maximumAllowedKg: number;

  constructor(nominalKg: number) {
    if (typeof nominalKg !== 'number' || Number.isNaN(nominalKg) || nominalKg <= 0) {
      throw new ValidationError(
        `Nominal capacity must be a positive number greater than 0. Received: ${nominalKg}`,
        'validation.invalidCapacity',
        { nominalKg }
      );
    }

    this.nominalKg = Math.round(nominalKg * 100) / 100;
    this.maximumAllowedKg = Math.round(this.nominalKg * Capacity.CAPACITY_TOLERANCE_MULTIPLIER * 100) / 100;
  }

  public static fromNominal(nominalKg: number): Capacity {
    return new Capacity(nominalKg);
  }

  /**
   * Calculates maximum allowed capacity (110% of nominal)
   */
  public static calculateMaximumAllowed(nominalKg: number): number {
    return Math.round(nominalKg * Capacity.CAPACITY_TOLERANCE_MULTIPLIER * 100) / 100;
  }

  /**
   * Calculates driver utilization percentage based on nominal capacity:
   * (assignedWeight / nominalKg) * 100
   */
  public static calculateUtilizationPercent(assignedWeightKg: number, nominalKg: number): number {
    if (nominalKg <= 0) return 0;
    return Math.round((assignedWeightKg / nominalKg) * 10000) / 100;
  }

  /**
   * Checks if an assigned weight is within the hard 110% capacity limit
   */
  public canAccommodate(assignedWeightKg: number): boolean {
    return assignedWeightKg <= this.maximumAllowedKg;
  }

  /**
   * Validates assigned weight and throws CapacityExceededError if it exceeds 110%
   */
  public assertCanAccommodate(driverId: string, assignedWeightKg: number): void {
    if (!this.canAccommodate(assignedWeightKg)) {
      throw new CapacityExceededError(driverId, assignedWeightKg, this.maximumAllowedKg);
    }
  }

  /**
   * Calculates utilization percentage for this capacity
   */
  public getUtilizationPercent(assignedWeightKg: number): number {
    return Capacity.calculateUtilizationPercent(assignedWeightKg, this.nominalKg);
  }
}
