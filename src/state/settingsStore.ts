import { create } from 'zustand';
import { GlobalSettings, GlobalSettingsProps } from '../core/domain/entities/Settings';
import { container } from '../core/application/di/container';

interface SettingsState {
  settings: GlobalSettings;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  saveSuccess: boolean;

  fetchSettings: () => Promise<void>;
  updateSettings: (props: GlobalSettingsProps) => Promise<void>;
  clearError: () => void;
  resetSaveSuccess: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: GlobalSettings.createDefault(),
  isLoading: false,
  isSaving: false,
  errorMessage: null,
  saveSuccess: false,

  fetchSettings: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const settings = await container.getGlobalSettingsUseCase.execute();
      set({ settings, isLoading: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      set({ isLoading: false, errorMessage: message });
    }
  },

  updateSettings: async (props: GlobalSettingsProps) => {
    set({ isSaving: true, errorMessage: null, saveSuccess: false });
    try {
      const updated = await container.updateGlobalSettingsUseCase.execute(props);
      set({ settings: updated, isSaving: false, saveSuccess: true, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      set({ isSaving: false, errorMessage: message });
      throw err;
    }
  },

  clearError: () => set({ errorMessage: null }),
  resetSaveSuccess: () => set({ saveSuccess: false })
}));
