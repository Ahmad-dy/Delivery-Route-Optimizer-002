import { ValidationError } from '../errors/DomainErrors';

export interface GeoPointProps {
  readonly latitude: number;
  readonly longitude: number;
}

export class GeoPoint {
  public readonly latitude: number;
  public readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    GeoPoint.validateCoordinates(latitude, longitude);
    this.latitude = latitude;
    this.longitude = longitude;
  }

  public static create(latitude: number, longitude: number): GeoPoint {
    return new GeoPoint(latitude, longitude);
  }

  public static validateCoordinates(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || Number.isNaN(latitude) || latitude < -90.0 || latitude > 90.0) {
      throw new ValidationError(
        `Invalid latitude: ${latitude}. Must be a valid number between -90.0 and +90.0.`,
        'validation.invalidLatitude',
        { latitude }
      );
    }

    if (typeof longitude !== 'number' || Number.isNaN(longitude) || longitude < -180.0 || longitude > 180.0) {
      throw new ValidationError(
        `Invalid longitude: ${longitude}. Must be a valid number between -180.0 and +180.0.`,
        'validation.invalidLongitude',
        { longitude }
      );
    }
  }

  public static isValid(latitude?: number | null, longitude?: number | null): boolean {
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return false;
    }
    return (
      typeof latitude === 'number' &&
      !Number.isNaN(latitude) &&
      latitude >= -90.0 &&
      latitude <= 90.0 &&
      typeof longitude === 'number' &&
      !Number.isNaN(longitude) &&
      longitude >= -180.0 &&
      longitude <= 180.0
    );
  }

  public equals(other: GeoPoint): boolean {
    return (
      Math.abs(this.latitude - other.latitude) < 1e-6 &&
      Math.abs(this.longitude - other.longitude) < 1e-6
    );
  }

  public toJSON(): GeoPointProps {
    return {
      latitude: this.latitude,
      longitude: this.longitude
    };
  }
}
