import { describe, it, expect } from 'vitest';
import { MockRoutingAdapter } from '../../core/infrastructure/routing/MockRoutingAdapter';
import { GenerateRouteMatrixUseCase } from '../../core/application/use-cases/routing/GenerateRouteMatrixUseCase';
import { CalculateRouteMetricsUseCase } from '../../core/application/use-cases/routing/CalculateRouteMetricsUseCase';
import { Depot } from '../../core/domain/entities/Depot';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';
import { DeliveryList } from '../../core/domain/entities/DeliveryList';
import { GeoPoint } from '../../core/domain/value-objects/GeoPoint';
import { DepotLocationInvalidError, RoutingInvalidRequestError } from '../../core/domain/errors/DomainErrors';

describe('Stage 4: Routing Use Cases & Service Contracts', () => {
  const routingService = new MockRoutingAdapter();
  const generateMatrixUseCase = new GenerateRouteMatrixUseCase(routingService);
  const calculateRouteMetricsUseCase = new CalculateRouteMetricsUseCase(routingService);

  const validDepot = new Depot(33.3152, 44.3661, 'Central Depot', 'Baghdad Industrial Zone');
  const stop1 = new DeliveryStop(
    'STOP-B1',
    'B001',
    'Supermarket A',
    33.3128,
    44.3546,
    [new DeliveryList('L101', 'B001', 'Supermarket A', 250)]
  );
  const stop2 = new DeliveryStop(
    'STOP-B2',
    'B002',
    'Hypermarket B',
    33.3054,
    44.4215,
    [new DeliveryList('L102', 'B002', 'Hypermarket B', 450)]
  );

  it('generates full road distance matrix for depot and verified delivery stops', async () => {
    const result = await generateMatrixUseCase.execute({
      depot: validDepot,
      stops: [stop1, stop2]
    });

    // Matrix size: (1 depot + 2 stops) = 3x3 = 9 elements
    expect(result.matrix.origins.length).toBe(3);
    expect(result.matrix.destinations.length).toBe(3);
    expect(result.matrix.elements.length).toBe(3);
    expect(result.matrix.elements[0].length).toBe(3);

    // Depot to Stop 1
    const depotToStop1 = result.matrix.elements[0][1];
    expect(depotToStop1.originId).toBe('DEPOT');
    expect(depotToStop1.destinationId).toBe('STOP-B1');
    expect(depotToStop1.distanceMeters).toBeGreaterThan(0);
    expect(depotToStop1.durationSeconds).toBeGreaterThan(0);
    expect(depotToStop1.status).toBe('OK');

    // Self diagonal distance should be 0
    const depotToDepot = result.matrix.elements[0][0];
    expect(depotToDepot.distanceMeters).toBe(0);
    expect(depotToDepot.durationSeconds).toBe(0);

    // Matrix totals
    expect(result.totalLocations).toBe(3);
    expect(result.totalConnections).toBe(9);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('calculates point to point route metrics accurately', async () => {
    const origin = { id: 'DEPOT', point: new GeoPoint(validDepot.latitude, validDepot.longitude) };
    const destination = { id: 'STOP-B1', point: new GeoPoint(stop1.latitude, stop1.longitude) };

    const result = await calculateRouteMetricsUseCase.execute({
      locations: [origin, destination]
    });

    expect(result.totalDistanceMeters).toBeGreaterThan(0);
    expect(result.totalDurationSeconds).toBeGreaterThan(0);
    expect(result.legs.length).toBe(1);
    expect(result.legs[0].distanceMeters).toBeGreaterThan(0);
    expect(result.legs[0].durationSeconds).toBeGreaterThan(0);
  });

  it('throws DepotLocationInvalidError when depot has invalid coordinates', async () => {
    const invalidDepot = {
      latitude: 0,
      longitude: 0,
      name: 'Invalid Depot',
      address: ''
    } as unknown as Depot;

    await expect(
      generateMatrixUseCase.execute({
        depot: invalidDepot,
        stops: [stop1]
      })
    ).rejects.toThrow(DepotLocationInvalidError);
  });

  it('throws RoutingInvalidRequestError when stops array is empty', async () => {
    await expect(
      generateMatrixUseCase.execute({
        depot: validDepot,
        stops: []
      })
    ).rejects.toThrow(RoutingInvalidRequestError);
  });
});
