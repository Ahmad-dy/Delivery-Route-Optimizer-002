import { ValidationError } from '../errors/DomainErrors';

export interface OptimizationConfigProps {
  readonly distanceWeight: number;      // e.g. 0.70 (70%)
  readonly loadBalanceWeight: number;   // e.g. 0.30 (30%)
  readonly capacityTolerance: number;   // e.g. 0.10 (10%)
}

export class OptimizationConfig {
  public static readonly DEFAULT_DISTANCE_WEIGHT = 0.70;
  public static readonly DEFAULT_LOAD_BALANCE_WEIGHT = 0.30;
  public static readonly DEFAULT_CAPACITY_TOLERANCE = 0.10;

  public readonly distanceWeight: number;
  public readonly loadBalanceWeight: number;
  public readonly capacityTolerance: number;

  constructor(
    distanceWeight = OptimizationConfig.DEFAULT_DISTANCE_WEIGHT,
    loadBalanceWeight = OptimizationConfig.DEFAULT_LOAD_BALANCE_WEIGHT,
    capacityTolerance = OptimizationConfig.DEFAULT_CAPACITY_TOLERANCE
  ) {
    OptimizationConfig.validate(distanceWeight, loadBalanceWeight, capacityTolerance);
    this.distanceWeight = distanceWeight;
    this.loadBalanceWeight = loadBalanceWeight;
    this.capacityTolerance = capacityTolerance;
  }

  public static default(): OptimizationConfig {
    return new OptimizationConfig();
  }

  public static validate(distanceWeight: number, loadBalanceWeight: number, capacityTolerance: number): void {
    if (typeof distanceWeight !== 'number' || distanceWeight < 0 || distanceWeight > 1) {
      throw new ValidationError(
        `distanceWeight must be between 0 and 1. Received: ${distanceWeight}`,
        'validation.invalidWeight'
      );
    }

    if (typeof loadBalanceWeight !== 'number' || loadBalanceWeight < 0 || loadBalanceWeight > 1) {
      throw new ValidationError(
        `loadBalanceWeight must be between 0 and 1. Received: ${loadBalanceWeight}`,
        'validation.invalidWeight'
      );
    }

    const sum = Math.round((distanceWeight + loadBalanceWeight) * 100) / 100;
    if (sum !== 1.0) {
      throw new ValidationError(
        `Sum of distanceWeight (${distanceWeight}) and loadBalanceWeight (${loadBalanceWeight}) must equal 1.0. Current sum: ${sum}`,
        'validation.weightsSumMustEqualOne'
      );
    }

    if (typeof capacityTolerance !== 'number' || capacityTolerance < 0 || capacityTolerance > 0.5) {
      throw new ValidationError(
        `capacityTolerance must be between 0 and 0.5. Received: ${capacityTolerance}`,
        'validation.invalidCapacityTolerance'
      );
    }
  }

  public toJSON(): OptimizationConfigProps {
    return {
      distanceWeight: this.distanceWeight,
      loadBalanceWeight: this.loadBalanceWeight,
      capacityTolerance: this.capacityTolerance
    };
  }
}
