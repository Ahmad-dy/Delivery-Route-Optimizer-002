import { DistributionResult } from '../entities/DistributionResult';
import { Driver } from '../entities/Driver';
import { Depot } from '../entities/Depot';
import { RouteMatrix } from '../../application/ports/IRoutingService';
import { CapacityDomainService } from './CapacityDomainService';

export interface InvariantViolation {
  readonly invariant: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface InvariantValidationResult {
  readonly isValid: boolean;
  readonly violations: readonly InvariantViolation[];
}

export class DistributionInvariantValidator {
  /**
   * Validates all hard operational and domain invariants on a candidate or final DistributionResult.
   */
  public static validate(
    result: DistributionResult,
    activeDrivers: readonly Driver[],
    depot: Depot,
    matrix?: RouteMatrix
  ): InvariantValidationResult {
    const violations: InvariantViolation[] = [];
    const activeDriverMap = new Map<string, Driver>();
    for (const d of activeDrivers) {
      if (d.active) {
        activeDriverMap.set(d.driverId, d);
      }
    }

    // 1. Inactive Drivers Check
    for (const route of result.routes) {
      const driver = activeDriverMap.get(route.driverId);
      if (!driver) {
        violations.push({
          invariant: 'ACTIVE_DRIVERS_ONLY',
          message: `Route assigned to unknown or inactive driver '${route.driverId}'.`,
          details: { driverId: route.driverId }
        });
        continue;
      }

      // 2. Hard Capacity Constraint (110% Operational Ceiling)
      const maxAllowed = CapacityDomainService.getMaximumAllowedCapacity(driver);
      if (route.totalWeightKg > maxAllowed) {
        violations.push({
          invariant: 'CAPACITY_CEILING_110',
          message: `Driver '${route.driverId}' payload ${route.totalWeightKg} kg exceeds 110% operational capacity ${maxAllowed} kg.`,
          details: { driverId: route.driverId, weightKg: route.totalWeightKg, maxAllowedKg: maxAllowed }
        });
      }

      // Check Routing Status (no failed routing allowed in approved state)
      if (route.routingStatus === 'ROUTING_UNAVAILABLE') {
        violations.push({
          invariant: 'ROUTING_STATUS_INTEGRITY',
          message: `Route for driver '${route.driverId}' has failed routing (ROUTING_UNAVAILABLE). ${route.routingErrorMessage ?? ''}`,
          details: { driverId: route.driverId }
        });
      }

      // Verify route calculated weight matches sum of stops
      const calculatedRouteWeight = route.orderedStops.reduce((sum, s) => sum + s.totalWeightKg, 0);
      const roundedCalc = Math.round(calculatedRouteWeight * 100) / 100;
      if (Math.abs(roundedCalc - route.totalWeightKg) > 0.05) {
        violations.push({
          invariant: 'ROUTE_WEIGHT_INTEGRITY',
          message: `Route weight ${route.totalWeightKg} kg does not match sum of stops ${roundedCalc} kg for driver '${route.driverId}'.`,
          details: { declared: route.totalWeightKg, calculated: roundedCalc }
        });
      }
    }

    // 3. Stop Atomicity (No Stop appears in multiple driver routes or unassigned simultaneously)
    const seenStopIds = new Map<string, string>(); // stopId -> location/driverId
    const seenBuyerCodes = new Map<string, string>(); // buyerCode -> location/driverId

    for (const route of result.routes) {
      for (const stop of route.orderedStops) {
        if (seenStopIds.has(stop.stopId)) {
          violations.push({
            invariant: 'STOP_ATOMICITY',
            message: `Delivery Stop '${stop.stopId}' is assigned multiple times (driver '${route.driverId}' and '${seenStopIds.get(stop.stopId)}').`,
            details: { stopId: stop.stopId, driverId: route.driverId }
          });
        } else {
          seenStopIds.set(stop.stopId, route.driverId);
        }

        // Check if physical buyer stop is split
        if (seenBuyerCodes.has(stop.buyerCode) && seenBuyerCodes.get(stop.buyerCode) !== route.driverId) {
          violations.push({
            invariant: 'BUYER_PHYSICAL_STOP_ATOMICITY',
            message: `Buyer '${stop.buyerCode}' is split across drivers ('${route.driverId}' and '${seenBuyerCodes.get(stop.buyerCode)}').`,
            details: { buyerCode: stop.buyerCode, driverId: route.driverId }
          });
        } else {
          seenBuyerCodes.set(stop.buyerCode, route.driverId);
        }
      }
    }

    // Check unassigned stops
    for (const stop of result.unassignedStops) {
      if (seenStopIds.has(stop.stopId)) {
        violations.push({
          invariant: 'STOP_ATOMICITY',
          message: `Delivery Stop '${stop.stopId}' is both assigned to '${seenStopIds.get(stop.stopId)}' and listed as unassigned.`,
          details: { stopId: stop.stopId }
        });
      }
    }

    // 4. Delivery List Atomicity (No List appears in multiple stops or drivers)
    const seenListNumbers = new Map<string, string>(); // listNumber -> driverId / unassigned

    for (const route of result.routes) {
      for (const stop of route.orderedStops) {
        for (const list of stop.lists) {
          if (seenListNumbers.has(list.listNumber)) {
            violations.push({
              invariant: 'LIST_ATOMICITY',
              message: `List #${list.listNumber} appears multiple times (assigned to '${route.driverId}' and '${seenListNumbers.get(list.listNumber)}').`,
              details: { listNumber: list.listNumber }
            });
          } else {
            seenListNumbers.set(list.listNumber, route.driverId);
          }
        }
      }
    }

    for (const stop of result.unassignedStops) {
      for (const list of stop.lists) {
        if (seenListNumbers.has(list.listNumber)) {
          violations.push({
            invariant: 'LIST_ATOMICITY',
            message: `List #${list.listNumber} appears in both assigned route '${seenListNumbers.get(list.listNumber)}' and unassigned stops.`,
            details: { listNumber: list.listNumber }
          });
        } else {
          seenListNumbers.set(list.listNumber, 'UNASSIGNED');
        }
      }
    }

    // 5. Matrix Consistency Check (If matrix provided, verify distances and durations are non-negative and from matrix)
    if (matrix) {
      const locationIndexMap = new Map<string, number>();
      matrix.origins.forEach((o, idx) => locationIndexMap.set(o.id, idx));

      for (const route of result.routes) {
        if (route.orderedStops.length > 0) {
          const pathIds = ['DEPOT', ...route.orderedStops.map(s => s.stopId), 'DEPOT'];
          let expectedDistance = 0;
          let expectedDuration = 0;
          let matrixLookupFailed = false;

          for (let i = 0; i < pathIds.length - 1; i++) {
            const fromId = pathIds[i];
            const toId = pathIds[i + 1];
            const fromIdx = locationIndexMap.get(fromId);
            const toIdx = locationIndexMap.get(toId);

            if (fromIdx === undefined || toIdx === undefined) {
              matrixLookupFailed = true;
              break;
            }

            const elem = matrix.elements[fromIdx]?.[toIdx];
            if (!elem || elem.status !== 'OK') {
              matrixLookupFailed = true;
              break;
            }

            expectedDistance += elem.distanceMeters;
            expectedDuration += elem.durationSeconds;
          }

          if (!matrixLookupFailed) {
            if (Math.abs(expectedDistance - route.totalDistanceMeters) > 5) {
              violations.push({
                invariant: 'ROUTE_DISTANCE_INTEGRITY',
                message: `Route distance ${route.totalDistanceMeters}m does not match matrix path sum ${expectedDistance}m for driver '${route.driverId}'.`,
                details: { declared: route.totalDistanceMeters, matrixSum: expectedDistance }
              });
            }
          }
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations: Object.freeze(violations)
    };
  }
}
