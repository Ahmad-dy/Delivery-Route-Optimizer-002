import { create } from 'zustand';
import { Buyer, BuyerProps } from '../core/domain/entities/Buyer';
import { container } from '../core/application/di/container';

interface BuyerState {
  buyers: readonly Buyer[];
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;

  fetchBuyers: () => Promise<void>;
  createBuyer: (props: BuyerProps) => Promise<Buyer>;
  updateBuyer: (props: BuyerProps) => Promise<Buyer>;
  deleteBuyer: (buyerCode: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useBuyerStore = create<BuyerState>((set, get) => ({
  buyers: [],
  isLoading: false,
  errorMessage: null,
  searchQuery: '',

  fetchBuyers: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const buyers = await container.listBuyersUseCase.execute();
      set({ buyers, isLoading: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load buyers';
      set({ isLoading: false, errorMessage: message });
    }
  },

  createBuyer: async (props: BuyerProps) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const newBuyer = await container.createBuyerUseCase.execute(props);
      const current = get().buyers;
      set({ buyers: [...current, newBuyer], isLoading: false, errorMessage: null });
      return newBuyer;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create buyer';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  updateBuyer: async (props: BuyerProps) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const updated = await container.updateBuyerUseCase.execute(props);
      const current = get().buyers;
      const updatedList = current.map(b => (b.buyerCode === updated.buyerCode ? updated : b));
      set({ buyers: updatedList, isLoading: false, errorMessage: null });
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update buyer';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  deleteBuyer: async (buyerCode: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      await container.deleteBuyerUseCase.execute(buyerCode);
      const current = get().buyers;
      const filtered = current.filter(b => b.buyerCode !== buyerCode);
      set({ buyers: filtered, isLoading: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete buyer';
      set({ isLoading: false, errorMessage: message });
      throw err;
    }
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  clearError: () => set({ errorMessage: null })
}));
