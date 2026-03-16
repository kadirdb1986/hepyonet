import { create } from 'zustand';

interface Membership {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantStatus: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  memberships: Membership[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRestaurantId: string | null;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  switchRestaurant: (restaurantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeRestaurantId: typeof window !== 'undefined' ? localStorage.getItem('activeRestaurantId') : null,

  setUser: (user) => {
    const currentActive = get().activeRestaurantId;
    const approvedMemberships = user.memberships.filter((m) => m.restaurantStatus === 'APPROVED');

    // Keep current selection if still valid, otherwise pick first approved
    let activeId = currentActive;
    if (!activeId || !approvedMemberships.some((m) => m.restaurantId === activeId)) {
      activeId = approvedMemberships[0]?.restaurantId || null;
    }

    if (activeId && typeof window !== 'undefined') {
      localStorage.setItem('activeRestaurantId', activeId);
    }

    set({ user, isAuthenticated: true, isLoading: false, activeRestaurantId: activeId });
  },

  setLoading: (isLoading) => set({ isLoading }),

  switchRestaurant: (restaurantId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeRestaurantId', restaurantId);
      window.location.reload();
    }
    set({ activeRestaurantId: restaurantId });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('activeRestaurantId');
    }
    set({ user: null, isAuthenticated: false, isLoading: false, activeRestaurantId: null });
  },
}));
