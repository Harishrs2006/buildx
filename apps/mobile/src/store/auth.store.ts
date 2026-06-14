import { create } from 'zustand';
import { api } from '../lib/api';

export type UserRole = 'BUYER' | 'SUPPLIER' | 'OPERATOR' | 'ADMIN';

interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  onboardingComplete: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
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
  pendingConfirmation: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setPendingConfirmation: (confirmation) => set({ pendingConfirmation: confirmation }),
  clear: () => set({ user: null, loading: false, pendingConfirmation: null }),

  syncWithBackend: async () => {
    try {
      const { data } = await api.post('/auth/sync');
      set({ user: data.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
