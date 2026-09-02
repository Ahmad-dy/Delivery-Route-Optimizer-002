import { Driver, DriverProps } from '../../../domain/entities/Driver';
import { DriverRepository } from '../../ports/DriverRepository';
import { NotFoundError, ValidationError } from '../../../domain/errors/DomainErrors';

export class CreateDriverUseCase {
  constructor(private readonly driverRepo: DriverRepository) {}

  public async execute(props: DriverProps): Promise<Driver> {
    const driver = Driver.create(props);
    const existing = await this.driverRepo.getById(driver.driverId);
    if (existing) {
      throw new ValidationError(
        `Driver with ID '${driver.driverId}' already exists.`,
        'validation.duplicateDriverId',
        { driverId: driver.driverId }
      );
    }
    await this.driverRepo.create(driver);
    return driver;
  }
}

export class UpdateDriverUseCase {
  constructor(private readonly driverRepo: DriverRepository) {}

  public async execute(props: DriverProps): Promise<Driver> {
    const driver = Driver.create(props);
    const existing = await this.driverRepo.getById(driver.driverId);
    if (!existing) {
      throw new NotFoundError('Driver', driver.driverId);
    }
    await this.driverRepo.update(driver);
    return driver;
  }
}

export class DeleteDriverUseCase {
  constructor(private readonly driverRepo: DriverRepository) {}

  public async execute(driverId: string): Promise<void> {
    const existing = await this.driverRepo.getById(driverId);
    if (!existing) {
      throw new NotFoundError('Driver', driverId);
    }
    await this.driverRepo.delete(driverId);
  }
}

export class SetDriverActiveUseCase {
  constructor(private readonly driverRepo: DriverRepository) {}

  public async execute(driverId: string, active: boolean): Promise<Driver> {
    const existing = await this.driverRepo.getById(driverId);
    if (!existing) {
      throw new NotFoundError('Driver', driverId);
    }
    await this.driverRepo.setActive(driverId, active);
    return existing.withActiveStatus(active);
  }
}

export class ListDriversUseCase {
  constructor(private readonly driverRepo: DriverRepository) {}

  public async execute(): Promise<readonly Driver[]> {
    return this.driverRepo.getAll();
  }
}
