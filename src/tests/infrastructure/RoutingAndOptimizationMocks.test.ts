import { describe, it, expect } from 'vitest';
import { MockRoutingAdapter } from '../../core/infrastructure/routing/MockRoutingAdapter';
import { MockOptimizationAdapter } from '../../core/infrastructure/optimization/MockOptimizationAdapter';
import { GeoPoint } from '../../core/domain/value-objects/GeoPoint';
import { Depot } from '../../core/domain/entities/Depot';
import { Driver } from '../../core/domain/entities/Driver';
import { DeliveryList } from '../../core/domain/entities/DeliveryList';
import { DeliveryStop } from '../../core/domain/entities/DeliveryStop';
import { OptimizationConfig } from '../../core/domain/value-objects/OptimizationConfig';

describe('Routing and Optimization Mocks (Contract Verification)', () => {
  const routingAdapter = new MockRoutingAdapter();
  const optimizationAdapter = new MockOptimizationAdapter();

  describe('MockRoutingAdapter', () => {
    it('computes distance matrix structure with expected dimensions and elements', async () => {
      const origins = [
        { id: 'O1', point: new GeoPoint(33.3152, 44.3661), name: 'Depot' },
        { id: 'O2', point: new GeoPoint(33.3128, 44.3546), name: 'Stop 1' }
      ];
      const destinations = [
        { id: 'D1', point: new GeoPoint(33.3054, 44.4215), name: 'Stop 2' },
        { id: 'D2', point: new GeoPoint(33.2981, 44.3318), name: 'Stop 3' }
      ];

      const matrix = await routingAdapter.computeDistanceMatrix({ origins, destinations });

      expect(matrix.elements.length).toBe(2);
      expect(matrix.elements[0].length).toBe(2);
      expect(matrix.elements[0][0].status).toBe('OK');
      expect(matrix.elements[0][0].distanceMeters).toBeGreaterThan(0);
      expect(matrix.elements[0][0].durationSeconds).toBeGreaterThan(0);
    });

    it('computes full route with polyline and leg segments', async () => {
      const origin = { id: 'DEPOT', point: new GeoPoint(33.3152, 44.3661) };
      const destination = { id: 'DEPOT', point: new GeoPoint(33.3152, 44.3661) };
      const waypoints = [
        { id: 'W1', point: new GeoPoint(33.3128, 44.3546) },
        { id: 'W2', point: new GeoPoint(33.3054, 44.4215) }
      ];

      const result = await routingAdapter.computeFullRoute({ origin, destination, waypoints });

      expect(result.totalDistanceMeters).toBeGreaterThan(0);
      expect(result.totalDurationSeconds).toBeGreaterThan(0);
      expect(result.encodedPolyline).toBeDefined();
      expect(result.legs.length).toBe(3); // origin -> w1 -> w2 -> destination
    });
  });

  describe('MockOptimizationAdapter', () => {
    it('returns compliant DistributionResult structure with routes and metrics', async () => {
      const depot = new Depot(33.3152, 44.3661, 'Central Depot');
      const drivers = [
        new Driver('D1', 'Driver 1', 1500, true),
        new Driver('D2', 'Driver 2', 1500, true)
      ];

      const list1 = new DeliveryList('L1', 'B1', 'Buyer 1', 300);
      const list2 = new DeliveryList('L2', 'B2', 'Buyer 2', 400);

      const stops = [
        new DeliveryStop('S1', 'B1', 'Buyer 1', 33.3128, 44.3546, [list1]),
        new DeliveryStop('S2', 'B2', 'Buyer 2', 33.3054, 44.4215, [list2])
      ];

      const config = OptimizationConfig.default();

      const result = await optimizationAdapter.optimize({
        depot,
        stops,
        drivers,
        config,
        routingService: routingAdapter
      });

      expect(result.routes).toBeDefined();
      expect(result.totalDistanceMeters).toBeGreaterThan(0);
      expect(result.totalDurationSeconds).toBeGreaterThan(0);
      expect(result.totalWeightKg).toBe(700);
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.activeDriversUsed).toBeGreaterThanOrEqual(1);
    });
  });
});
