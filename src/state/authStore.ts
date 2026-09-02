import { create } from 'zustand';
import { AuthUser } from '../core/application/ports/AuthRepository';
import { container } from '../core/application/di/container';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  errorMessage: string | null;
  initialize: () => () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  enterAsDemo: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  errorMessage: null,

  initialize: () => {
    set({ status: 'loading', errorMessage: null });
    const unsubscribe = container.observeAuthStateUseCase.execute((user) => {
      if (user) {
        set({ user, status: 'authenticated', errorMessage: null });
      } else {
        set({ user: null, status: 'unauthenticated', errorMessage: null });
      }
    });
    return unsubscribe;
  },

  signInWithEmail: async (email: string, pass: string) => {
    set({ status: 'loading', errorMessage: null });
    try {
      const user = await container.signInUseCase.executeWithEmail(email, pass);
      set({ user, status: 'authenticated', errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      set({ status: 'unauthenticated', errorMessage: message });
      throw err;
    }
  },

  signInWithGoogle: async () => {
    set({ status: 'loading', errorMessage: null });
    try {
      const user = await container.signInUseCase.executeWithGoogle();
      set({ user, status: 'authenticated', errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      set({ status: 'unauthenticated', errorMessage: message });
      throw err;
    }
  },

  signOut: async () => {
    set({ status: 'loading', errorMessage: null });
    try {
      await container.signOutUseCase.execute();
      set({ user: null, status: 'unauthenticated', errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      set({ status: 'error', errorMessage: message });
    }
  },

  enterAsDemo: () => {
    const demoUser: AuthUser = {
      uid: 'demo-dispatcher-uid',
      email: 'dispatcher@delivery-route.iq',
      displayName: 'مأمور التوزيع التجريبي',
      role: 'DISPATCHER'
    };
    set({ user: demoUser, status: 'authenticated', errorMessage: null });
  },

  clearError: () => set({ errorMessage: null })
}));
