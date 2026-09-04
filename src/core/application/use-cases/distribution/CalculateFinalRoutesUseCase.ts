import { IRoutingService, RoutePoint } from '../../ports/IRoutingService';
import { Route } from '../../../domain/entities/Route';
import { Depot } from '../../../domain/entities/Depot';
import { GeoPoint } from '../../../domain/value-objects/GeoPoint';

export interface CalculateFinalRoutesRequest {
  readonly routes: readonly Route[];
  readonly depot: Depot;
  readonly affectedDriverIds?: readonly string[]; // If provided, only recalculate these drivers
  readonly onProgress?: (completed: number, total: number, currentDriverId: string) => void;
}

export interface CalculateFinalRoutesResult {
  readonly routes: readonly Route[];
  readonly hasRoutingFailures: boolean;
  readonly failedDriverIds: readonly string[];
}

export class CalculateFinalRoutesUseCase {
  constructor(private readonly routingService: IRoutingService) {}

  public async execute(request: CalculateFinalRoutesRequest): Promise<CalculateFinalRoutesResult> {
    const { routes, depot, affectedDriverIds, onProgress } = request;
    const targetDriverIds = affectedDriverIds ? new Set(affectedDriverIds) : null;

    const depotPoint: RoutePoint = {
      id: 'DEPOT',
      point: new GeoPoint(depot.latitude, depot.longitude),
      name: depot.name
    };

    const routesToProcess = routes.filter(
      r => !targetDriverIds || targetDriverIds.has(r.driverId)
    );
    const totalToProcess = routesToProcess.length;
    let completedCount = 0;

    const updatedRoutes: Route[] = [];
    const failedDriverIds: string[] = [];

    for (const route of routes) {
      // If not in affected drivers, keep existing route
      if (targetDriverIds && !targetDriverIds.has(route.driverId)) {
        updatedRoutes.push(route);
        continue;
      }

      // If route has no stops, reset metrics to 0
      if (route.orderedStops.length === 0) {
        updatedRoutes.push(
          new Route({
            driverId: route.driverId,
            orderedStops: [],
            totalWeightKg: 0,
            utilizationPercent: 0,
            totalDistanceMeters: 0,
            totalDurationSeconds: 0,
            polyline: undefined,
            isManuallyModified: route.isManuallyModified,
            routingStatus: 'OK',
            legs: []
          })
        );
        completedCount++;
        onProgress?.(completedCount, totalToProcess, route.driverId);
        continue;
      }

      // Build waypoints for Depot -> Stops -> Depot
      const waypoints: RoutePoint[] = route.orderedStops.map(s => ({
        id: s.stopId,
        point: new GeoPoint(s.latitude, s.longitude),
        name: s.buyerName
      }));

      try {
        const routeResult = await this.routingService.calculateRoute({
          origin: depotPoint,
          destination: depotPoint,
          waypoints
        });

        // Strict validation: road distance, travel duration, AND polyline MUST all be valid
        const isDistanceValid = Number.isFinite(routeResult.totalDistanceMeters) && routeResult.totalDistanceMeters > 0;
        const isDurationValid = Number.isFinite(routeResult.totalDurationSeconds) && routeResult.totalDurationSeconds >= 0;
        const hasPolyline = typeof routeResult.encodedPolyline === 'string' && routeResult.encodedPolyline.trim().length > 0;

        if (!isDistanceValid || !isDurationValid || !hasPolyline) {
          // If any metric is invalid or missing, it CANNOT be marked as 'OK'
          failedDriverIds.push(route.driverId);
          const errorReason = !isDistanceValid
            ? 'مسافة الطرق غير صالحة من مزود التوجيه (Invalid road distance)'
            : !isDurationValid
            ? 'مدة الرحلة غير صالحة من مزود التوجيه (Invalid travel duration)'
            : 'مسار الخريطة (Polyline) مفقود من مزود التوجيه';

          updatedRoutes.push(
            new Route({
              driverId: route.driverId,
              orderedStops: route.orderedStops,
              totalWeightKg: route.totalWeightKg,
              utilizationPercent: route.utilizationPercent,
              totalDistanceMeters: 0, // Reset to 0: prevents displaying misleading stale metrics
              totalDurationSeconds: 0, // Reset to 0: duration is uncalculated
              polyline: undefined, // Do NOT display a corrupted/stale polyline
              isManuallyModified: route.isManuallyModified,
              routingStatus: 'ROUTING_UNAVAILABLE',
              routingErrorMessage: errorReason,
              legs: []
            })
          );
        } else {
          updatedRoutes.push(
            new Route({
              driverId: route.driverId,
              orderedStops: route.orderedStops,
              totalWeightKg: route.totalWeightKg,
              utilizationPercent: route.utilizationPercent,
              totalDistanceMeters: routeResult.totalDistanceMeters,
              totalDurationSeconds: routeResult.totalDurationSeconds,
              polyline: routeResult.encodedPolyline,
              isManuallyModified: route.isManuallyModified,
              routingStatus: 'OK',
              legs: routeResult.legs
            })
          );
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown routing error';
        failedDriverIds.push(route.driverId);
        updatedRoutes.push(
          new Route({
            driverId: route.driverId,
            orderedStops: route.orderedStops,
            totalWeightKg: route.totalWeightKg,
            utilizationPercent: route.utilizationPercent,
            totalDistanceMeters: 0, // Reset to 0: prevents displaying misleading stale metrics
            totalDurationSeconds: 0, // Reset to 0: duration is uncalculated
            polyline: undefined,
            isManuallyModified: route.isManuallyModified,
            routingStatus: 'ROUTING_UNAVAILABLE',
            routingErrorMessage: errorMsg,
            legs: []
          })
        );
      }

      completedCount++;
      onProgress?.(completedCount, totalToProcess, route.driverId);
    }

    return {
      routes: Object.freeze(updatedRoutes),
      hasRoutingFailures: failedDriverIds.length > 0,
      failedDriverIds: Object.freeze(failedDriverIds)
    };
  }
}
