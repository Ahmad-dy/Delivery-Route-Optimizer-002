import { ValidationError } from '../errors/DomainErrors';
import { GeoPoint } from '../value-objects/GeoPoint';

export interface BuyerProps {
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly latitude: number;
  readonly longitude: number;
}

export class Buyer {
  public readonly buyerCode: string;
  public readonly buyerName: string;
  public readonly latitude: number;
  public readonly longitude: number;

  constructor(buyerCode: string, buyerName: string, latitude: number, longitude: number) {
    Buyer.validate(buyerCode, buyerName, latitude, longitude);
    this.buyerCode = buyerCode.trim();
    this.buyerName = buyerName.trim();
    this.latitude = latitude;
    this.longitude = longitude;
  }

  public static create(props: BuyerProps): Buyer {
    return new Buyer(props.buyerCode, props.buyerName, props.latitude, props.longitude);
  }

  public static validate(buyerCode: string, buyerName: string, latitude: number, longitude: number): void {
    if (!buyerCode || typeof buyerCode !== 'string' || buyerCode.trim().length < 2) {
      throw new ValidationError(
        'Buyer Code is required and must contain at least 2 characters.',
        'validation.buyerCodeRequired',
        { buyerCode }
      );
    }

    if (buyerCode.trim().length > 64) {
      throw new ValidationError(
        'Buyer Code cannot exceed 64 characters.',
        'validation.buyerCodeTooLong',
        { buyerCode }
      );
    }

    if (!buyerName || typeof buyerName !== 'string' || buyerName.trim().length < 2) {
      throw new ValidationError(
        'Buyer Name is required and must contain at least 2 characters.',
        'validation.buyerNameRequired',
        { buyerName }
      );
    }

    if (buyerName.trim().length > 128) {
      throw new ValidationError(
        'Buyer Name cannot exceed 128 characters.',
        'validation.buyerNameTooLong',
        { buyerName }
      );
    }

    GeoPoint.validateCoordinates(latitude, longitude);
  }

  public getGeoPoint(): GeoPoint {
    return new GeoPoint(this.latitude, this.longitude);
  }

  public toJSON(): BuyerProps {
    return {
      buyerCode: this.buyerCode,
      buyerName: this.buyerName,
      latitude: this.latitude,
      longitude: this.longitude
    };
  }
}
