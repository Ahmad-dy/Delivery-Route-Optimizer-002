import { GlobalSettings } from '../../domain/entities/Settings';

export interface SettingsRepository {
  /**
   * Retrieves current global configuration and depot warehouse location
   */
  getGlobalSettings(): Promise<GlobalSettings>;

  /**
   * Updates global configuration and depot warehouse location
   */
  updateGlobalSettings(settings: GlobalSettings): Promise<void>;
}
