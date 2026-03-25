import { create } from "zustand"

export interface Membership {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  role: string
  restaurantStatus: string
}

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  isSuperAdmin: boolean
  memberships: Membership[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  activeRestaurantId: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  switchRestaurant: (restaurantId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeRestaurantId:
    typeof window !== "undefined"
      ? localStorage.getItem("activeRestaurantId")
      : null,

  setUser: (user) => {
    if (user) {
      const approvedMemberships = user.memberships.filter(
        (m) => m.restaurantStatus === "APPROVED"
      )
      const storedRestaurantId =
        typeof window !== "undefined"
          ? localStorage.getItem("activeRestaurantId")
          : null
      const activeId =
        storedRestaurantId &&
        approvedMemberships.some((m) => m.restaurantId === storedRestaurantId)
          ? storedRestaurantId
          : approvedMemberships[0]?.restaurantId || null

      if (activeId && typeof window !== "undefined") {
        localStorage.setItem("activeRestaurantId", activeId)
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        activeRestaurantId: activeId,
      })
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        activeRestaurantId: null,
      })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  switchRestaurant: (restaurantId) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("activeRestaurantId", restaurantId)
    }
    set({ activeRestaurantId: restaurantId })
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("activeRestaurantId")
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRestaurantId: null,
    })
  },
}))
