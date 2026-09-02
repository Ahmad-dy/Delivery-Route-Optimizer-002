import { Depot } from '../../../domain/entities/Depot';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { Driver } from '../../../domain/entities/Driver';
import { DistributionResult } from '../../../domain/entities/DistributionResult';
import { OptimizationConfig } from '../../../domain/value-objects/OptimizationConfig';
import { IOptimizationService } from '../../ports/IOptimizationService';
import { IRoutingService } from '../../ports/IRoutingService';
import { ValidationError } from '../../../domain/errors/DomainErrors';

export interface OptimizeDistributionDTO {
  readonly depot: Depot;
  readonly stops: readonly DeliveryStop[];
  readonly drivers: readonly Driver[];
  readonly config?: OptimizationConfig;
}

export class OptimizeDistributionUseCase {
  constructor(
    private readonly optimizationService: IOptimizationService,
    private readonly routingService: IRoutingService
  ) {}

  public async execute(dto: OptimizeDistributionDTO): Promise<DistributionResult> {
    if (!dto.depot) {
      throw new ValidationError('Central Depot configuration is required for optimization.');
    }

    if (!Array.isArray(dto.stops)) {
      throw new ValidationError('Delivery stops list is required.');
    }

    if (!Array.isArray(dto.drivers)) {
      throw new ValidationError('Driver fleet list is required.');
    }

    const config = dto.config || new OptimizationConfig();

    return this.optimizationService.optimize({
      depot: dto.depot,
      stops: dto.stops,
      drivers: dto.drivers,
      config,
      routingService: this.routingService
    });
  }
}
