import { Driver } from '../../domain/entities/Driver';

export interface DriverRepository {
  /**
   * Retrieves all drivers in the fleet
   */
  getAll(): Promise<readonly Driver[]>;

  /**
   * Retrieves a single driver by unique driverId
   */
  getById(driverId: string): Promise<Driver | null>;

  /**
   * Creates a new driver profile
   */
  create(driver: Driver): Promise<void>;

  /**
   * Updates an existing driver profile
   */
  update(driver: Driver): Promise<void>;

  /**
   * Deletes a driver from the fleet registry
   */
  delete(driverId: string): Promise<void>;

  /**
   * Toggles active operational participation status for a driver
   */
  setActive(driverId: string, active: boolean): Promise<void>;
}
