"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, activeRestaurantId, setUser, setLoading, switchRestaurant, logout: storeLogout } = useAuthStore()

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get("/auth/me")
      setUser(res.data)
    } catch {
      storeLogout()
    }
  }, [setUser, setLoading, storeLogout])

  useEffect(() => {
    if (!user && isLoading) {
      checkAuth()
    }
  }, [user, isLoading, checkAuth])

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password })
    const { accessToken, refreshToken, user: userData } = res.data
    localStorage.setItem("accessToken", accessToken)
    localStorage.setItem("refreshToken", refreshToken)
    setUser(userData)
    router.push("/dashboard")
  }

  const register = async (data: {
    email: string
    password: string
    name: string
    restaurantName?: string
  }) => {
    const res = await api.post("/auth/register", data)
    return res.data
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const forgotPassword = async (email: string) => {
    await api.post("/auth/forgot-password", { email })
  }

  const logout = () => {
    storeLogout()
    router.push("/auth/login")
  }

  const activeMembership = user?.memberships.find(
    (m) => m.restaurantId === activeRestaurantId && m.restaurantStatus === "APPROVED"
  )

  return {
    user,
    isAuthenticated,
    isLoading,
    activeRestaurantId,
    activeMembership,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    logout,
    switchRestaurant,
    checkAuth,
  }
}
