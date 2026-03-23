"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
})

type LoginForm = z.infer<typeof loginSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const res = await api.post("/auth/login", {
        email: data.email,
        password: data.password,
      })
      const { accessToken, refreshToken, user } = res.data

      if (!user.isSuperAdmin) {
        toast.error("Bu panel yalnızca yöneticiler içindir")
        setIsLoading(false)
        return
      }

      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      setUser(user)
      router.push("/admin")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Giriş başarısız")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-fixed/30 blur-[150px]" />
      </div>

      {/* Content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          {/* Brand */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary p-2.5 rounded-xl shadow-lg rotate-3 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-3xl">admin_panel_settings</span>
              </div>
            </div>
            <h1 className="font-headline font-black text-4xl tracking-tight text-on-surface">HepYonet</h1>
            <p className="text-on-surface-variant font-medium mt-1">Yönetim Paneli</p>
          </div>

          {/* Form Card */}
          <div className="w-full bg-surface-container-lowest p-8 lg:p-10 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] ring-1 ring-outline-variant/10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-headline font-bold text-on-surface">Admin Girişi</h2>
                <p className="text-sm text-on-surface-variant">SuperAdmin hesabınızla giriş yapın.</p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" htmlFor="email">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  E-posta
                </label>
                <input
                  {...register("email")}
                  className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none"
                  id="email"
                  placeholder="admin@hepyonet.com"
                  type="email"
                />
                {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" htmlFor="password">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Şifre
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none"
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {errors.password && <p className="text-xs text-error mt-1">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-black/10 hover:shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}</span>
                {!isLoading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
