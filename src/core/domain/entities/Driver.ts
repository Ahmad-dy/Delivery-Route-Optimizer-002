import { ValidationError } from '../errors/DomainErrors';
import { Capacity } from '../value-objects/Capacity';

export interface DriverProps {
  readonly driverId: string;
  readonly driverName: string;
  readonly maximumLoadKg: number;
  readonly active: boolean;
}

export class Driver {
  public readonly driverId: string;
  public readonly driverName: string;
  public readonly maximumLoadKg: number;
  public readonly active: boolean;

  private readonly capacityVo: Capacity;

  constructor(
    propsOrId: DriverProps | string,
    driverName?: string,
    maximumLoadKg?: number,
    active = true
  ) {
    let props: DriverProps;
    if (typeof propsOrId === 'string') {
      props = {
        driverId: propsOrId,
        driverName: driverName || '',
        maximumLoadKg: maximumLoadKg ?? 0,
        active
      };
    } else {
      props = propsOrId;
    }

    Driver.validate(props);
    this.driverId = props.driverId.trim();
    this.driverName = props.driverName.trim();
    this.maximumLoadKg = Math.round(props.maximumLoadKg * 100) / 100;
    this.active = props.active;

    this.capacityVo = new Capacity(this.maximumLoadKg);
  }

  public static create(props: DriverProps): Driver {
    return new Driver(props);
  }

  public static validate(props: DriverProps): void {
    if (!props.driverId || typeof props.driverId !== 'string' || props.driverId.trim().length < 2) {
      throw new ValidationError(
        'Driver ID is required and must contain at least 2 characters.',
        'validation.driverIdRequired',
        { driverId: props.driverId }
      );
    }

    if (!props.driverName || typeof props.driverName !== 'string' || props.driverName.trim().length < 2) {
      throw new ValidationError(
        'Driver Name is required and must contain at least 2 characters.',
        'validation.driverNameRequired',
        { driverName: props.driverName }
      );
    }

    if (typeof props.maximumLoadKg !== 'number' || Number.isNaN(props.maximumLoadKg) || props.maximumLoadKg <= 0) {
      throw new ValidationError(
        'Maximum Load must be a positive number greater than 0 kg.',
        'validation.invalidDriverCapacity',
        { maximumLoadKg: props.maximumLoadKg }
      );
    }

    if (props.maximumLoadKg > 100000) {
      throw new ValidationError(
        'Maximum Load exceeds maximum plausible vehicle threshold (100,000 kg).',
        'validation.capacityTooLarge',
        { maximumLoadKg: props.maximumLoadKg }
      );
    }

    if (typeof props.active !== 'boolean') {
      throw new ValidationError(
        'Driver active status must be a boolean.',
        'validation.invalidActiveStatus'
      );
    }
  }

  /**
   * Domain-level calculation: maximumAllowedLoadKg = maximumLoadKg * 1.10
   */
  public get maximumAllowedLoadKg(): number {
    return this.capacityVo.maximumAllowedKg;
  }

  /**
   * Checks if this driver can accommodate a given total cargo weight
   */
  public canAccommodateWeight(weightKg: number): boolean {
    return this.capacityVo.canAccommodate(weightKg);
  }

  /**
   * Asserts that the assigned weight does not exceed 110% of nominal capacity
   */
  public assertCanAccommodateWeight(weightKg: number): void {
    this.capacityVo.assertCanAccommodate(this.driverId, weightKg);
  }

  /**
   * Calculates utilization percentage for this driver
   */
  public calculateUtilization(assignedWeightKg: number): number {
    return this.capacityVo.getUtilizationPercent(assignedWeightKg);
  }

  public withActiveStatus(active: boolean): Driver {
    return new Driver({
      ...this.toJSON(),
      active
    });
  }

  public toJSON(): DriverProps {
    return {
      driverId: this.driverId,
      driverName: this.driverName,
      maximumLoadKg: this.maximumLoadKg,
      active: this.active
    };
  }
}
