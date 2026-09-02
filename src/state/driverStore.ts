import { create } from 'zustand';
import { Driver, DriverProps } from '../core/domain/entities/Driver';
import { container } from '../core/application/di/container';

interface DriverState {
  drivers: readonly Driver[];
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;

  fetchDrivers: () => Promise<void>;
  createDriver: (props: DriverProps) => Promise<Driver>;
  updateDriver: (props: DriverProps) => Promise<Driver>;
  deleteDriver: (driverId: string) => Promise<void>;
  toggleDriverActive: (driverId: string, active: boolean) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useDriverStore = create<DriverState>((set, get) => ({
  drivers: [],
  isLoading: false,
  errorMessage: null,
  searchQuery: '',

  fetchDrivers: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const drivers = await container.listDriversUseCase.execute();
      set({ drivers, isLoading: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load drivers';
      set({ isLoading: false, errorMessage: message });
    }
  },

  createDriver: async (props: DriverProps) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const newDriver = await container.createDriverUseCase.execute(props);
      const current = get().drivers;
      set({ drivers: [...current, newDriver], isLoading: false, errorMessage: null });
      return newDriver;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create driver';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  updateDriver: async (props: DriverProps) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const updated = await container.updateDriverUseCase.execute(props);
      const current = get().drivers;
      const updatedList = current.map(d => (d.driverId === updated.driverId ? updated : d));
      set({ drivers: updatedList, isLoading: false, errorMessage: null });
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update driver';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  deleteDriver: async (driverId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      await container.deleteDriverUseCase.execute(driverId);
      const current = get().drivers;
      const filtered = current.filter(d => d.driverId !== driverId);
      set({ drivers: filtered, isLoading: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete driver';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  toggleDriverActive: async (driverId: string, active: boolean) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const updated = await container.setDriverActiveUseCase.execute(driverId, active);
      const current = get().drivers;
      const updatedList = current.map(d => (d.driverId === updated.driverId ? updated : d));
      set({ drivers: updatedList, isLoading: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle driver active status';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  clearError: () => set({ errorMessage: null })
}));
