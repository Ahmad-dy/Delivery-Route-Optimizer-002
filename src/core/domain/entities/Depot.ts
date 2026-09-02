import { GeoPoint } from '../value-objects/GeoPoint';

export interface DepotProps {
  readonly latitude: number;
  readonly longitude: number;
  readonly name?: string;
  readonly address?: string;
}

export class Depot {
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly name: string;
  public readonly address?: string;

  constructor(latitude: number, longitude: number, name = 'Central Depot', address?: string) {
    GeoPoint.validateCoordinates(latitude, longitude);
    this.latitude = latitude;
    this.longitude = longitude;
    this.name = name.trim();
    this.address = address?.trim();
  }

  public static create(props: DepotProps): Depot {
    return new Depot(props.latitude, props.longitude, props.name, props.address);
  }

  public getGeoPoint(): GeoPoint {
    return new GeoPoint(this.latitude, this.longitude);
  }

  public toJSON(): DepotProps {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      name: this.name,
      address: this.address
    };
  }
}
