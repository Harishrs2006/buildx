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
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  syncWithBackend: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, loading: false }),

  syncWithBackend: async () => {
    try {
      const { data } = await api.post('/auth/sync');
      set({ user: data.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
