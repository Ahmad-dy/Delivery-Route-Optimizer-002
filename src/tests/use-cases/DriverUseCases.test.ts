import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDriverRepository } from '../../core/infrastructure/repositories/MemoryRepositories';
import {
  CreateDriverUseCase,
  UpdateDriverUseCase,
  DeleteDriverUseCase,
  SetDriverActiveUseCase,
  ListDriversUseCase
} from '../../core/application/use-cases/drivers/DriverUseCases';
import { NotFoundError, ValidationError } from '../../core/domain/errors/DomainErrors';

describe('Driver Use Cases (Clean Architecture with Memory Repository)', () => {
  let driverRepo: MemoryDriverRepository;
  let createDriver: CreateDriverUseCase;
  let updateDriver: UpdateDriverUseCase;
  let deleteDriver: DeleteDriverUseCase;
  let setDriverActive: SetDriverActiveUseCase;
  let listDrivers: ListDriversUseCase;

  beforeEach(() => {
    driverRepo = new MemoryDriverRepository();
    createDriver = new CreateDriverUseCase(driverRepo);
    updateDriver = new UpdateDriverUseCase(driverRepo);
    deleteDriver = new DeleteDriverUseCase(driverRepo);
    setDriverActive = new SetDriverActiveUseCase(driverRepo);
    listDrivers = new ListDriversUseCase(driverRepo);
  });

  it('creates and lists drivers', async () => {
    await createDriver.execute({
      driverId: 'DRV-1',
      driverName: 'Driver One',
      maximumLoadKg: 1500,
      active: true
    });

    const drivers = await listDrivers.execute();
    expect(drivers.length).toBe(1);
    expect(drivers[0].driverId).toBe('DRV-1');
    expect(drivers[0].maximumLoadKg).toBe(1500);
  });

  it('rejects duplicate driverId creation', async () => {
    await createDriver.execute({
      driverId: 'DRV-DUP',
      driverName: 'Driver Original',
      maximumLoadKg: 1000,
      active: true
    });

    await expect(
      createDriver.execute({
        driverId: 'DRV-DUP',
        driverName: 'Driver Duplicate',
        maximumLoadKg: 2000,
        active: true
      })
    ).rejects.toThrow(ValidationError);
  });

  it('toggles driver active participation status', async () => {
    await createDriver.execute({
      driverId: 'DRV-TOGGLE',
      driverName: 'Driver Active',
      maximumLoadKg: 1200,
      active: true
    });

    const deactivated = await setDriverActive.execute('DRV-TOGGLE', false);
    expect(deactivated.active).toBe(false);

    const reloaded = await driverRepo.getById('DRV-TOGGLE');
    expect(reloaded?.active).toBe(false);
  });

  it('updates driver details', async () => {
    await createDriver.execute({
      driverId: 'DRV-UPD',
      driverName: 'Initial Name',
      maximumLoadKg: 1000,
      active: true
    });

    const updated = await updateDriver.execute({
      driverId: 'DRV-UPD',
      driverName: 'New Name',
      maximumLoadKg: 1800,
      active: true
    });

    expect(updated.driverName).toBe('New Name');
    expect(updated.maximumLoadKg).toBe(1800);
  });

  it('deletes driver from fleet registry', async () => {
    await createDriver.execute({
      driverId: 'DRV-DEL',
      driverName: 'To Delete',
      maximumLoadKg: 1000,
      active: true
    });

    await deleteDriver.execute('DRV-DEL');
    const result = await driverRepo.getById('DRV-DEL');
    expect(result).toBeNull();
  });

  it('throws NotFoundError when updating non-existent driver', async () => {
    await expect(
      updateDriver.execute({
        driverId: 'NON_EXISTENT',
        driverName: 'Ghost',
        maximumLoadKg: 1000,
        active: true
      })
    ).rejects.toThrow(NotFoundError);
  });
});
