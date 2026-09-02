import { Route, RouteProps } from './Route';
import { DeliveryStop, DeliveryStopProps } from './DeliveryStop';

export interface OptimizationMetrics {
  readonly initialDistanceMeters: number;
  readonly finalDistanceMeters: number;
  readonly initialLoadVariance: number;
  readonly finalLoadVariance: number;
  readonly finalOptimizationScore: number;
  readonly totalDurationSeconds: number;
  readonly iterationCount: number;
  readonly executionDurationMs: number;
  readonly activeDriversUsed: number;
}

export interface DistributionWarning {
  readonly code: string;
  readonly message: string;
  readonly messageKey: string;
  readonly params?: Record<string, string | number>;
}

export interface DistributionResultProps {
  readonly routes: readonly RouteProps[];
  readonly unassignedStops: readonly DeliveryStopProps[];
  readonly oversizedStops: readonly DeliveryStopProps[];
  readonly warnings: readonly DistributionWarning[];
  readonly totalDistanceMeters: number;
  readonly totalDurationSeconds: number;
  readonly totalWeightKg: number;
  readonly driversUsed: number;
  readonly metrics?: OptimizationMetrics;
  readonly generatedAt: string;
}

export class DistributionResult {
  public readonly routes: readonly Route[];
  public readonly unassignedStops: readonly DeliveryStop[];
  public readonly oversizedStops: readonly DeliveryStop[];
  public readonly warnings: readonly DistributionWarning[];
  public readonly totalDistanceMeters: number;
  public readonly totalDurationSeconds: number;
  public readonly totalWeightKg: number;
  public readonly driversUsed: number;
  public readonly metrics?: OptimizationMetrics;
  public readonly generatedAt: string;

  constructor(props: {
    routes: readonly Route[];
    unassignedStops: readonly DeliveryStop[];
    oversizedStops: readonly DeliveryStop[];
    warnings: readonly DistributionWarning[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    totalWeightKg: number;
    driversUsed: number;
    metrics?: OptimizationMetrics;
    generatedAt?: string;
  }) {
    this.routes = Object.freeze([...props.routes]);
    this.unassignedStops = Object.freeze([...props.unassignedStops]);
    this.oversizedStops = Object.freeze([...props.oversizedStops]);
    this.warnings = Object.freeze([...props.warnings]);
    this.totalDistanceMeters = Math.round(props.totalDistanceMeters);
    this.totalDurationSeconds = Math.round(props.totalDurationSeconds);
    this.totalWeightKg = Math.round(props.totalWeightKg * 100) / 100;
    this.driversUsed = props.driversUsed;
    this.metrics = props.metrics;
    this.generatedAt = props.generatedAt || new Date().toISOString();
  }

  public static create(props: DistributionResultProps): DistributionResult {
    return new DistributionResult({
      routes: props.routes.map(r => Route.create(r)),
      unassignedStops: props.unassignedStops.map(s => DeliveryStop.create(s)),
      oversizedStops: props.oversizedStops.map(s => DeliveryStop.create(s)),
      warnings: props.warnings,
      totalDistanceMeters: props.totalDistanceMeters,
      totalDurationSeconds: props.totalDurationSeconds,
      totalWeightKg: props.totalWeightKg,
      driversUsed: props.driversUsed,
      metrics: props.metrics,
      generatedAt: props.generatedAt
    });
  }

  public toJSON(): DistributionResultProps {
    return {
      routes: this.routes.map(r => r.toJSON()),
      unassignedStops: this.unassignedStops.map(s => s.toJSON()),
      oversizedStops: this.oversizedStops.map(s => s.toJSON()),
      warnings: this.warnings,
      totalDistanceMeters: this.totalDistanceMeters,
      totalDurationSeconds: this.totalDurationSeconds,
      totalWeightKg: this.totalWeightKg,
      driversUsed: this.driversUsed,
      metrics: this.metrics,
      generatedAt: this.generatedAt
    };
  }
}
