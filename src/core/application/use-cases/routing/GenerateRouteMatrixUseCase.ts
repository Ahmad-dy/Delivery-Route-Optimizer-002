import { IRoutingService, RouteMatrix, RoutePoint } from '../../ports/IRoutingService';
import { Depot } from '../../../domain/entities/Depot';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { DepotLocationInvalidError, RoutingInvalidRequestError, ValidationError } from '../../../domain/errors/DomainErrors';
import { GeoPoint } from '../../../domain/value-objects/GeoPoint';

export interface GenerateRouteMatrixInput {
  readonly depot: Depot;
  readonly stops: readonly DeliveryStop[];
}

export interface GenerateRouteMatrixOutput {
  readonly matrix: RouteMatrix;
  readonly totalLocations: number;
  readonly totalConnections: number;
  readonly durationMs: number;
}

export class GenerateRouteMatrixUseCase {
  constructor(private readonly routingService: IRoutingService) {}

  public async execute(input: GenerateRouteMatrixInput): Promise<GenerateRouteMatrixOutput> {
    const startTime = Date.now();
    const { depot, stops } = input;

    // 1. Validate Depot Location
    this.validateDepot(depot);

    // 2. Validate Stops existence
    if (!stops || stops.length === 0) {
      throw new RoutingInvalidRequestError('At least one delivery stop is required to generate a route matrix.');
    }

    // 3. Validate All Delivery Stops
    this.validateStops(stops);

    // 3. Construct Route Points (Depot + Delivery Stops)
    const depotPoint: RoutePoint = {
      id: 'DEPOT',
      point: new GeoPoint(depot.latitude, depot.longitude),
      name: depot.name || 'Main Depot'
    };

    const stopPoints: RoutePoint[] = stops.map(stop => ({
      id: stop.stopId,
      point: new GeoPoint(stop.latitude, stop.longitude),
      name: stop.buyerName
    }));

    const allLocations: readonly RoutePoint[] = Object.freeze([depotPoint, ...stopPoints]);

    // 4. Compute Distance & Duration Matrix
    const matrix = await this.routingService.getRouteMatrix({
      origins: allLocations,
      destinations: allLocations
    });

    const totalLocations = allLocations.length;
    const totalConnections = totalLocations * totalLocations;

    return Object.freeze({
      matrix,
      totalLocations,
      totalConnections,
      durationMs: Date.now() - startTime
    });
  }

  private validateDepot(depot: Depot): void {
    if (!depot) {
      throw new DepotLocationInvalidError(undefined, undefined);
    }

    const isValidGps =
      typeof depot.latitude === 'number' &&
      typeof depot.longitude === 'number' &&
      !isNaN(depot.latitude) &&
      !isNaN(depot.longitude) &&
      depot.latitude >= -90 &&
      depot.latitude <= 90 &&
      depot.longitude >= -180 &&
      depot.longitude <= 180 &&
      !(depot.latitude === 0 && depot.longitude === 0);

    if (!isValidGps) {
      throw new DepotLocationInvalidError(depot.latitude, depot.longitude);
    }
  }

  private validateStops(stops: readonly DeliveryStop[]): void {
    for (const stop of stops) {
      const isValidGps =
        typeof stop.latitude === 'number' &&
        typeof stop.longitude === 'number' &&
        !isNaN(stop.latitude) &&
        !isNaN(stop.longitude) &&
        stop.latitude >= -90 &&
        stop.latitude <= 90 &&
        stop.longitude >= -180 &&
        stop.longitude <= 180 &&
        !(stop.latitude === 0 && stop.longitude === 0);

      if (!isValidGps) {
        throw new ValidationError(
          `Delivery stop '${stop.stopId}' for buyer '${stop.buyerName}' has invalid GPS coordinates (${stop.latitude}, ${stop.longitude}).`,
          'errors.missingBuyerLocation',
          { stopId: stop.stopId, buyerCode: stop.buyerCode, latitude: stop.latitude, longitude: stop.longitude }
        );
      }
    }
  }
}
