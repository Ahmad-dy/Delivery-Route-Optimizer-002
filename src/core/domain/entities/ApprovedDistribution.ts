import { Driver, DriverProps } from './Driver';
import { Route, RouteProps } from './Route';
import { DeliveryStop, DeliveryStopProps } from './DeliveryStop';
import { OptimizationMetrics, DistributionWarning } from './DistributionResult';
import { Depot, DepotProps } from './Depot';

export interface ApprovedDistributionProps {
  readonly distributionId: string;
  readonly createdAt: string;
  readonly approvedAt: string;
  readonly approvedBy?: string;
  readonly depot: DepotProps;
  readonly drivers: readonly DriverProps[];
  readonly routes: readonly RouteProps[];
  readonly stops: readonly DeliveryStopProps[];
  readonly unassigned: readonly DeliveryStopProps[];
  readonly metrics: OptimizationMetrics;
  readonly optimizationScore: number;
  readonly warnings: readonly DistributionWarning[];
  readonly revision: number;
}

/**
 * Immutable snapshot representing a formally approved delivery distribution.
 * Once approved, this document cannot be directly mutated.
 * Any subsequent manual adjustments generate a new revision.
 */
export class ApprovedDistribution {
  public readonly distributionId: string;
  public readonly createdAt: string;
  public readonly approvedAt: string;
  public readonly approvedBy?: string;
  public readonly depot: Depot;
  public readonly drivers: readonly Driver[];
  public readonly routes: readonly Route[];
  public readonly stops: readonly DeliveryStop[];
  public readonly unassigned: readonly DeliveryStop[];
  public readonly metrics: OptimizationMetrics;
  public readonly optimizationScore: number;
  public readonly warnings: readonly DistributionWarning[];
  public readonly revision: number;

  constructor(props: {
    distributionId: string;
    createdAt: string;
    approvedAt: string;
    approvedBy?: string;
    depot: Depot;
    drivers: readonly Driver[];
    routes: readonly Route[];
    stops: readonly DeliveryStop[];
    unassigned: readonly DeliveryStop[];
    metrics: OptimizationMetrics;
    optimizationScore: number;
    warnings: readonly DistributionWarning[];
    revision: number;
  }) {
    this.distributionId = props.distributionId;
    this.createdAt = props.createdAt;
    this.approvedAt = props.approvedAt;
    this.approvedBy = props.approvedBy;
    this.depot = props.depot;
    this.drivers = Object.freeze([...props.drivers]);
    this.routes = Object.freeze([...props.routes]);
    this.stops = Object.freeze([...props.stops]);
    this.unassigned = Object.freeze([...props.unassigned]);
    this.metrics = Object.freeze({ ...props.metrics });
    this.optimizationScore = props.optimizationScore;
    this.warnings = Object.freeze([...props.warnings]);
    this.revision = Math.max(1, props.revision);
    Object.freeze(this);
  }

  public static create(props: ApprovedDistributionProps): ApprovedDistribution {
    return new ApprovedDistribution({
      distributionId: props.distributionId,
      createdAt: props.createdAt,
      approvedAt: props.approvedAt,
      approvedBy: props.approvedBy,
      depot: Depot.create(props.depot),
      drivers: props.drivers.map(d => Driver.create(d)),
      routes: props.routes.map(r => Route.create(r)),
      stops: props.stops.map(s => DeliveryStop.create(s)),
      unassigned: props.unassigned.map(u => DeliveryStop.create(u)),
      metrics: props.metrics,
      optimizationScore: props.optimizationScore,
      warnings: props.warnings,
      revision: props.revision
    });
  }

  public toJSON(): ApprovedDistributionProps {
    return {
      distributionId: this.distributionId,
      createdAt: this.createdAt,
      approvedAt: this.approvedAt,
      approvedBy: this.approvedBy,
      depot: this.depot.toJSON(),
      drivers: this.drivers.map(d => d.toJSON()),
      routes: this.routes.map(r => r.toJSON()),
      stops: this.stops.map(s => s.toJSON()),
      unassigned: this.unassigned.map(u => u.toJSON()),
      metrics: { ...this.metrics },
      optimizationScore: this.optimizationScore,
      warnings: [...this.warnings],
      revision: this.revision
    };
  }
}
