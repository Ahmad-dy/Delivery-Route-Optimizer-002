import { Depot, DepotProps } from './Depot';
import { OptimizationConfig, OptimizationConfigProps } from '../value-objects/OptimizationConfig';

export interface GlobalSettingsProps {
  readonly depot: DepotProps;
  readonly optimizationConfig?: OptimizationConfigProps;
  readonly companyName?: string;
  readonly updatedAt?: string;
}

export class GlobalSettings {
  public static readonly DEFAULT_SETTING_ID = 'global_config';
  public static readonly DEFAULT_BAGHDAD_DEPOT: DepotProps = {
    latitude: 33.3152,
    longitude: 44.3661,
    name: 'المستودع الرئيسي - بغداد'
  };

  public readonly depot: Depot;
  public readonly optimizationConfig: OptimizationConfig;
  public readonly companyName: string;
  public readonly updatedAt?: string;

  constructor(
    depotProps: DepotProps = GlobalSettings.DEFAULT_BAGHDAD_DEPOT,
    optimizationConfigProps?: OptimizationConfigProps,
    companyName = 'شركة التوزيع اللوجستية',
    updatedAt?: string
  ) {
    this.depot = Depot.create(depotProps);
    this.optimizationConfig = optimizationConfigProps
      ? new OptimizationConfig(
          optimizationConfigProps.distanceWeight,
          optimizationConfigProps.loadBalanceWeight,
          optimizationConfigProps.capacityTolerance
        )
      : OptimizationConfig.default();
    this.companyName = companyName.trim();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  public static createDefault(): GlobalSettings {
    return new GlobalSettings();
  }

  public withDepot(depotProps: DepotProps): GlobalSettings {
    return new GlobalSettings(
      depotProps,
      this.optimizationConfig.toJSON(),
      this.companyName,
      new Date().toISOString()
    );
  }

  public withOptimizationConfig(configProps: OptimizationConfigProps): GlobalSettings {
    return new GlobalSettings(
      this.depot.toJSON(),
      configProps,
      this.companyName,
      new Date().toISOString()
    );
  }

  public toJSON(): GlobalSettingsProps {
    return {
      depot: this.depot.toJSON(),
      optimizationConfig: this.optimizationConfig.toJSON(),
      companyName: this.companyName,
      updatedAt: this.updatedAt
    };
  }
}
