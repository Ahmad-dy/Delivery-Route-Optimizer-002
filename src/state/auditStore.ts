import { create } from 'zustand';
import { container } from '../core/application/di/container';
import { AuditEvent } from '../core/domain/entities/AuditEvent';
import { AuditFilter } from '../core/application/ports/IAuditRepository';

export interface AuditState {
  events: readonly AuditEvent[];
  isLoading: boolean;
  error: string | null;

  fetchAuditTrail: (filter?: AuditFilter) => Promise<void>;
  clearAuditTrail: () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  events: Object.freeze([]),
  isLoading: false,
  error: null,

  fetchAuditTrail: async (filter?: AuditFilter) => {
    set({ isLoading: true, error: null });
    try {
      const events = await container.getAuditHistoryUseCase.execute(filter);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'فشل في استرجاع سجل التدقيق والعمليات.'
      });
    }
  },

  clearAuditTrail: () => {
    set({ events: Object.freeze([]), error: null });
  }
}));
