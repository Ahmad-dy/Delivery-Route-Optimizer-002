import { DeliveryStop } from '../entities/DeliveryStop';
import { RouteMatrix } from '../../application/ports/IRoutingService';
import { OptimizationEvaluationService } from './OptimizationEvaluationService';

export class RouteSequenceOptimizer {
  /**
   * Optimizes the visitation order of stops for a single driver using road network distance matrix.
   * Employs deterministic Nearest-Neighbor construction followed by 2-Opt local search.
   */
  public static optimizeSequence(
    stops: readonly DeliveryStop[],
    locationIndexMap: Map<string, number>,
    matrix: RouteMatrix
  ): {
    orderedStops: readonly DeliveryStop[];
    distanceMeters: number;
    durationSeconds: number;
    twoOptImprovements: number;
  } {
    if (stops.length <= 1) {
      const stopIds = stops.map(s => s.stopId);
      const metrics = OptimizationEvaluationService.calculateRouteMetricsFromMatrix(
        stopIds,
        locationIndexMap,
        matrix
      );
      return {
        orderedStops: [...stops],
        distanceMeters: metrics.distanceMeters,
        durationSeconds: metrics.durationSeconds,
        twoOptImprovements: 0
      };
    }

    // 1. Initial Nearest-Neighbor Insertion Starting from DEPOT
    const depotIdx = locationIndexMap.get('DEPOT')!;
    const unvisited = [...stops];
    const initialOrdered: DeliveryStop[] = [];

    let currentLocIdx = depotIdx;
    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minDistance = Infinity;
      let bestStopIdx = -1;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const candIdx = locationIndexMap.get(candidate.stopId)!;
        const elem = matrix.elements[currentLocIdx]?.[candIdx];
        const dist = elem && elem.status === 'OK' ? elem.distanceMeters : Infinity;

        // Tie breaking on distance and stopId
        if (dist < minDistance || (dist === minDistance && candidate.stopId < (unvisited[bestStopIdx]?.stopId || ''))) {
          minDistance = dist;
          nearestIdx = candIdx;
          bestStopIdx = i;
        }
      }

      if (bestStopIdx !== -1) {
        initialOrdered.push(unvisited[bestStopIdx]);
        currentLocIdx = nearestIdx;
        unvisited.splice(bestStopIdx, 1);
      } else {
        // Fallback for any unreachable in NN loop
        initialOrdered.push(unvisited.shift()!);
      }
    }

    // 2. Deterministic 2-Opt Improvement
    let currentStops = [...initialOrdered];
    let currentMetrics = OptimizationEvaluationService.calculateRouteMetricsFromMatrix(
      currentStops.map(s => s.stopId),
      locationIndexMap,
      matrix
    );

    let improved = true;
    let twoOptImprovements = 0;
    const maxIterations = 50;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      const n = currentStops.length;
      for (let i = 0; i < n - 1; i++) {
        for (let k = i + 1; k < n; k++) {
          // Perform 2-opt reversal between i and k
          const candidateStops = [
            ...currentStops.slice(0, i),
            ...currentStops.slice(i, k + 1).reverse(),
            ...currentStops.slice(k + 1)
          ];

          const candidateMetrics = OptimizationEvaluationService.calculateRouteMetricsFromMatrix(
            candidateStops.map(s => s.stopId),
            locationIndexMap,
            matrix
          );

          if (candidateMetrics.distanceMeters < currentMetrics.distanceMeters) {
            currentStops = candidateStops;
            currentMetrics = candidateMetrics;
            improved = true;
            twoOptImprovements++;
            break;
          }
        }
        if (improved) break;
      }
    }

    return {
      orderedStops: Object.freeze(currentStops),
      distanceMeters: currentMetrics.distanceMeters,
      durationSeconds: currentMetrics.durationSeconds,
      twoOptImprovements
    };
  }
}
