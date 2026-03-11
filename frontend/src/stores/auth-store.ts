import { create } from 'zustand';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  restaurant: Restaurant | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
