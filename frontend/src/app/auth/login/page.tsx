"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
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
      await login(data.email, data.password)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Giriş başarısız")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    // Will be implemented as inline email input
    // For now, just a placeholder
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden min-h-screen">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 editorial-gradient flex items-center justify-center opacity-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-fixed/30 blur-[150px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          {/* Brand */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary p-2.5 rounded-xl shadow-lg rotate-3 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-3xl">restaurant_menu</span>
              </div>
            </div>
            <h1 className="font-headline font-black text-4xl tracking-tight text-on-surface">HepYonet</h1>
            <p className="text-on-surface-variant font-medium mt-1">Restoran Yönetim Sistemi</p>
          </div>

          {/* Form Card */}
          <div className="w-full bg-surface-container-lowest p-8 lg:p-10 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] ring-1 ring-outline-variant/10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <h2 className="text-2xl font-headline font-bold text-on-surface">Giriş Yap</h2>
                <p className="text-sm text-on-surface-variant">Devam etmek için bilgilerinizi girin.</p>
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl font-medium text-on-surface"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Google ile giriş yap</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center gap-4">
                <div className="flex-grow h-[1px] bg-outline-variant/30" />
                <span className="text-xs font-bold uppercase tracking-widest text-outline">Veya</span>
                <div className="flex-grow h-[1px] bg-outline-variant/30" />
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
                  placeholder="isim@restoran.com"
                  type="email"
                />
                {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" htmlFor="password">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Şifre
                  </label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-on-primary-container hover:underline">
                    Şifremi Unuttum
                  </button>
                </div>
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

          {/* Footer */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-on-surface-variant text-sm font-medium">
              Hesabın yok mu?{" "}
              <Link href="/auth/register" className="text-primary font-bold ml-1 hover:underline">
                Kayıt Ol
              </Link>
            </p>
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-outline-variant/20">
              <Link href="/privacy" className="text-xs font-bold text-outline uppercase tracking-widest hover:text-on-surface transition-colors">
                Gizlilik
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
