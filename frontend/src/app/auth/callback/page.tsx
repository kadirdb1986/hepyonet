"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import api from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

export default function AuthCallbackPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          throw new Error("Oturum alınamadı")
        }

        localStorage.setItem("accessToken", session.access_token)
        if (session.refresh_token) {
          localStorage.setItem("refreshToken", session.refresh_token)
        }

        const res = await api.get("/auth/me")
        setUser(res.data)
        router.push("/dashboard")
      } catch (err: unknown) {
        const e = err as { message?: string }
        setError(e.message || "Giriş yapılamadı")
        setTimeout(() => router.push("/auth/login"), 3000)
      }
    }

    handleCallback()
  }, [router, setUser])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-error text-5xl">error</span>
          <p className="text-on-surface-variant">{error}</p>
          <p className="text-sm text-outline">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-on-surface-variant font-medium">Giriş yapılıyor...</p>
      </div>
    </div>
  )
}
