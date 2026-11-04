import { create } from 'zustand';
import { api } from '../lib/api';

export type UserRole = 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER' | 'OPERATOR' | 'ADMIN';

interface AuthUser {
  id: string;
  // Phone sign-in users have a phone, Google sign-in users have an email
  phone?: string;
  email?: string;
  name: string;
  role: UserRole;
  onboardingComplete: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  // Set when Firebase sign-in worked but the API could not be reached (shown on the sign-in screen)
  syncError: string | null;
  // Holds the Firebase confirmation object between phone.tsx and otp.tsx
  pendingConfirmation: any | null;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingConfirmation: (confirmation: any | null) => void;
  syncWithBackend: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  syncError: null,
  pendingConfirmation: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setPendingConfirmation: (confirmation) => set({ pendingConfirmation: confirmation }),
  clear: () => set({ user: null, loading: false, syncError: null, pendingConfirmation: null }),

  syncWithBackend: async () => {
    set({ syncError: null });
    // The free API host sleeps when idle and can take up to a minute to wake: wait long, retry once
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await api.post('/auth/sync', undefined, { timeout: 60_000 });
        set({ user: data.data, loading: false, syncError: null });
        return;
      } catch (err: any) {
        if (attempt === 1) {
          set({
            loading: false,
            syncError: err?.message?.includes('timeout') || err?.message === 'Network Error'
              ? 'Signed in, but we could not reach Sthiva. Check your internet and try again.'
              : err?.message || 'Signed in, but we could not open your account. Please try again.',
          });
        }
      }
    }
  },
}));
