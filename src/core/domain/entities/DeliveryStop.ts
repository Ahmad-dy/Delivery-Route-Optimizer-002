import { ValidationError } from '../errors/DomainErrors';
import { GeoPoint } from '../value-objects/GeoPoint';
import { DeliveryList, DeliveryListProps } from './DeliveryList';

export interface DeliveryStopProps {
  readonly stopId: string;
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly lists: readonly DeliveryListProps[];
  readonly totalWeightKg: number;
}

export class DeliveryStop {
  public readonly stopId: string;
  public readonly buyerCode: string;
  public readonly buyerName: string;
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly lists: readonly DeliveryList[];
  public readonly totalWeightKg: number;

  constructor(
    stopId: string,
    buyerCode: string,
    buyerName: string,
    latitude: number,
    longitude: number,
    lists: readonly DeliveryList[]
  ) {
    DeliveryStop.validate(stopId, buyerCode, buyerName, latitude, longitude, lists);
    this.stopId = stopId.trim();
    this.buyerCode = buyerCode.trim();
    this.buyerName = buyerName.trim();
    this.latitude = latitude;
    this.longitude = longitude;
    this.lists = Object.freeze([...lists]);
    this.totalWeightKg = DeliveryStop.calculateTotalWeight(lists);
  }

  public static create(props: Omit<DeliveryStopProps, 'totalWeightKg'> & { totalWeightKg?: number }): DeliveryStop {
    const listEntities = props.lists.map(l => DeliveryList.create(l));
    return new DeliveryStop(
      props.stopId,
      props.buyerCode,
      props.buyerName,
      props.latitude,
      props.longitude,
      listEntities
    );
  }

  public static calculateTotalWeight(lists: readonly DeliveryList[]): number {
    const sum = lists.reduce((acc, l) => acc + l.weightKg, 0);
    return Math.round(sum * 100) / 100;
  }

  public static validate(
    stopId: string,
    buyerCode: string,
    buyerName: string,
    latitude: number,
    longitude: number,
    lists: readonly DeliveryList[]
  ): void {
    if (!stopId || typeof stopId !== 'string') {
      throw new ValidationError('Stop ID is required.', 'validation.stopIdRequired');
    }

    if (!buyerCode || typeof buyerCode !== 'string') {
      throw new ValidationError('Buyer Code is required on delivery stop.', 'validation.buyerCodeRequired');
    }

    if (!buyerName || typeof buyerName !== 'string') {
      throw new ValidationError('Buyer Name is required on delivery stop.', 'validation.buyerNameRequired');
    }

    GeoPoint.validateCoordinates(latitude, longitude);

    if (!Array.isArray(lists) || lists.length === 0) {
      throw new ValidationError(
        'Delivery stop must contain at least one delivery list.',
        'validation.emptyStopLists',
        { stopId, buyerCode }
      );
    }

    // Verify all lists belong to the same buyer code
    for (const list of lists) {
      if (list.buyerCode !== buyerCode) {
        throw new ValidationError(
          `List #${list.listNumber} buyer (${list.buyerCode}) does not match stop buyer (${buyerCode}).`,
          'validation.stopBuyerMismatch'
        );
      }
    }
  }

  public getGeoPoint(): GeoPoint {
    return new GeoPoint(this.latitude, this.longitude);
  }

  public toJSON(): DeliveryStopProps {
    return {
      stopId: this.stopId,
      buyerCode: this.buyerCode,
      buyerName: this.buyerName,
      latitude: this.latitude,
      longitude: this.longitude,
      lists: this.lists.map(l => l.toJSON()),
      totalWeightKg: this.totalWeightKg
    };
  }
}
