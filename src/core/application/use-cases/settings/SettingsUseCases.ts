import { GlobalSettings, GlobalSettingsProps } from '../../../domain/entities/Settings';
import { SettingsRepository } from '../../ports/SettingsRepository';

export class GetGlobalSettingsUseCase {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  public async execute(): Promise<GlobalSettings> {
    return this.settingsRepo.getGlobalSettings();
  }
}

export class UpdateGlobalSettingsUseCase {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  public async execute(props: GlobalSettingsProps): Promise<GlobalSettings> {
    const settings = new GlobalSettings(
      props.depot,
      props.optimizationConfig,
      props.companyName,
      new Date().toISOString()
    );
    await this.settingsRepo.updateGlobalSettings(settings);
    return settings;
  }
}
