import { Depot } from '../../domain/entities/Depot';
import { DeliveryStop } from '../../domain/entities/DeliveryStop';
import { Driver } from '../../domain/entities/Driver';
import { DistributionResult } from '../../domain/entities/DistributionResult';
import { OptimizationConfig } from '../../domain/value-objects/OptimizationConfig';
import { IRoutingService } from './IRoutingService';

export interface OptimizationRequest {
  readonly depot: Depot;
  readonly stops: readonly DeliveryStop[];
  readonly drivers: readonly Driver[];
  readonly config: OptimizationConfig;
  readonly routingService: IRoutingService;
}

export interface IOptimizationService {
  /**
   * Executes multi-vehicle delivery list distribution and route optimization
   */
  optimize(request: OptimizationRequest): Promise<DistributionResult>;
}
