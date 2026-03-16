'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import { useEffect } from 'react';

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, activeRestaurantId, setUser, setLoading, switchRestaurant, logout: clearAuth } = useAuthStore();

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const register = async (payload: {
    email: string;
    password: string;
    name: string;
    restaurantName?: string;
  }) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const logout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      clearAuth();
    }
  };

  useEffect(() => {
    if (isLoading && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  // Derive active membership for convenience
  const activeMembership = user?.memberships.find((m) => m.restaurantId === activeRestaurantId) || null;

  return {
    user,
    isAuthenticated,
    isLoading,
    activeRestaurantId,
    activeMembership,
    login,
    register,
    logout,
    checkAuth,
    switchRestaurant,
  };
}
