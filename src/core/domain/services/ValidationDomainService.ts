import { Buyer, BuyerProps } from '../entities/Buyer';
import { Driver, DriverProps } from '../entities/Driver';
import { DeliveryList, DeliveryListProps } from '../entities/DeliveryList';
import { DeliveryStop, DeliveryStopProps } from '../entities/DeliveryStop';
import { CapacityDomainService } from './CapacityDomainService';
import { DuplicateListError, ValidationError, CapacityExceededError } from '../errors/DomainErrors';

export class ValidationDomainService {
  /**
   * Validates Buyer properties
   */
  public static validateBuyer(props: BuyerProps): void {
    Buyer.validate(props.buyerCode, props.buyerName, props.latitude, props.longitude);
  }

  /**
   * Validates Driver properties
   */
  public static validateDriver(props: DriverProps): void {
    Driver.validate(props);
  }

  /**
   * Validates DeliveryList properties
   */
  public static validateList(props: DeliveryListProps): void {
    DeliveryList.validate(props.listNumber, props.buyerCode, props.buyerName, props.weightKg);
  }

  /**
   * Validates a batch of DeliveryLists, checking for duplicates
   */
  public static validateListBatch(lists: readonly DeliveryListProps[]): void {
    const seenNumbers = new Set<string>();
    for (const list of lists) {
      this.validateList(list);
      const normalizedNum = list.listNumber.trim();
      if (seenNumbers.has(normalizedNum)) {
        throw new DuplicateListError(normalizedNum);
      }
      seenNumbers.add(normalizedNum);
    }
  }

  /**
   * Validates DeliveryStop properties
   */
  public static validateStop(props: DeliveryStopProps): void {
    const listEntities = props.lists.map(l => DeliveryList.create(l));
    DeliveryStop.validate(
      props.stopId,
      props.buyerCode,
      props.buyerName,
      props.latitude,
      props.longitude,
      listEntities
    );

    // Verify calculated total weight matches sum of lists
    const calculatedWeight = DeliveryStop.calculateTotalWeight(listEntities);
    if (Math.abs(calculatedWeight - props.totalWeightKg) > 0.01) {
      throw new ValidationError(
        `Total stop weight mismatch: declared ${props.totalWeightKg} kg vs calculated ${calculatedWeight} kg.`,
        'validation.stopWeightMismatch',
        { declared: props.totalWeightKg, calculated: calculatedWeight }
      );
    }
  }

  /**
   * Validates driver capacity constraint (weight <= 1.10 * nominalCapacity)
   */
  public static validateDriverCapacity(driver: Driver, assignedWeightKg: number): void {
    if (!CapacityDomainService.canAssignWeight(driver, assignedWeightKg)) {
      const maxAllowed = CapacityDomainService.getMaximumAllowedCapacity(driver);
      throw new CapacityExceededError(driver.driverId, assignedWeightKg, maxAllowed);
    }
  }
}
