import { IRoutingService, FullRouteCalculationResult, RoutePoint } from '../../ports/IRoutingService';
import { ValidationError } from '../../../domain/errors/DomainErrors';

export interface CalculateRouteMetricsInput {
  readonly locations: readonly RoutePoint[];
}

export class CalculateRouteMetricsUseCase {
  constructor(private readonly routingService: IRoutingService) {}

  public async execute(input: CalculateRouteMetricsInput): Promise<FullRouteCalculationResult> {
    const { locations } = input;

    if (!locations || locations.length === 0) {
      return Object.freeze({
        locationIds: Object.freeze([]),
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        legs: Object.freeze([])
      });
    }

    if (locations.length === 1) {
      return Object.freeze({
        locationIds: Object.freeze([locations[0].id]),
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        legs: Object.freeze([])
      });
    }

    // Validate location coordinates
    for (const loc of locations) {
      const p = loc.point;
      const isValid =
        p &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number' &&
        !isNaN(p.latitude) &&
        !isNaN(p.longitude) &&
        p.latitude >= -90 &&
        p.latitude <= 90 &&
        p.longitude >= -180 &&
        p.longitude <= 180 &&
        !(p.latitude === 0 && p.longitude === 0);

      if (!isValid) {
        throw new ValidationError(
          `Location '${loc.id}' has invalid GPS coordinates (${p?.latitude}, ${p?.longitude}).`,
          'errors.invalidGpsCoordinates',
          { locationId: loc.id, latitude: p?.latitude, longitude: p?.longitude }
        );
      }
    }

    const origin = locations[0];
    const destination = locations[locations.length - 1];
    const waypoints = locations.slice(1, -1);

    return this.routingService.calculateRoute({
      origin,
      destination,
      waypoints
    });
  }
}
