import { DeliveryStop, DeliveryStopProps } from './DeliveryStop';

export interface RouteProps {
  readonly driverId: string;
  readonly orderedStops: readonly DeliveryStopProps[];
  readonly totalWeightKg: number;
  readonly utilizationPercent: number;
  readonly totalDistanceMeters: number;
  readonly totalDurationSeconds: number;
  readonly polyline?: string;
  readonly isManuallyModified: boolean;
}

export class Route {
  public readonly driverId: string;
  public readonly orderedStops: readonly DeliveryStop[];
  public readonly totalWeightKg: number;
  public readonly utilizationPercent: number;
  public readonly totalDistanceMeters: number;
  public readonly totalDurationSeconds: number;
  public readonly polyline?: string;
  public readonly isManuallyModified: boolean;

  constructor(props: {
    driverId: string;
    orderedStops: readonly DeliveryStop[];
    totalWeightKg: number;
    utilizationPercent: number;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    polyline?: string;
    isManuallyModified?: boolean;
  }) {
    this.driverId = props.driverId;
    this.orderedStops = Object.freeze([...props.orderedStops]);
    this.totalWeightKg = Math.round(props.totalWeightKg * 100) / 100;
    this.utilizationPercent = Math.round(props.utilizationPercent * 100) / 100;
    this.totalDistanceMeters = Math.round(props.totalDistanceMeters);
    this.totalDurationSeconds = Math.round(props.totalDurationSeconds);
    this.polyline = props.polyline;
    this.isManuallyModified = Boolean(props.isManuallyModified);
  }

  public static create(props: RouteProps): Route {
    const stops = props.orderedStops.map(s => DeliveryStop.create(s));
    return new Route({
      driverId: props.driverId,
      orderedStops: stops,
      totalWeightKg: props.totalWeightKg,
      utilizationPercent: props.utilizationPercent,
      totalDistanceMeters: props.totalDistanceMeters,
      totalDurationSeconds: props.totalDurationSeconds,
      polyline: props.polyline,
      isManuallyModified: props.isManuallyModified
    });
  }

  public get stopCount(): number {
    return this.orderedStops.length;
  }

  public get listCount(): number {
    return this.orderedStops.reduce((acc, stop) => acc + stop.lists.length, 0);
  }

  public toJSON(): RouteProps {
    return {
      driverId: this.driverId,
      orderedStops: this.orderedStops.map(s => s.toJSON()),
      totalWeightKg: this.totalWeightKg,
      utilizationPercent: this.utilizationPercent,
      totalDistanceMeters: this.totalDistanceMeters,
      totalDurationSeconds: this.totalDurationSeconds,
      polyline: this.polyline,
      isManuallyModified: this.isManuallyModified
    };
  }
}
