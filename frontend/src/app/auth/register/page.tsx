"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

const registerSchema = z.object({
  name: z.string().min(1, "Ad Soyad gerekli"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "En az 6 karakter olmalıdır"),
  restaurantName: z.string().optional(),
  terms: z.literal(true, { error: "Koşulları kabul etmelisiniz" }),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerUser, loginWithGoogle } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasRestaurant, setHasRestaurant] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        restaurantName: data.restaurantName || undefined,
      })
      setSuccess(true)
      setHasRestaurant(!!data.restaurantName)
      toast.success("Kayıt başarılı!")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Kayıt başarısız")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-[460px] text-center space-y-6">
          <div className="bg-surface-container-lowest p-10 rounded-xl shadow-ambient">
            <span className="material-symbols-outlined text-secondary text-5xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Kayıt Başarılı!</h2>
            <p className="text-on-surface-variant">
              {hasRestaurant
                ? "Restoran onayı bekleniyor. Onaylandığında e-posta ile bilgilendirileceksiniz."
                : "Hesabınız oluşturuldu. Giriş yapabilirsiniz."}
            </p>
            <Link
              href="/auth/login"
              className="inline-block mt-6 py-3 px-8 bg-primary text-on-primary font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-secondary-container/10 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[0%] w-[30%] h-[30%] rounded-full bg-primary-fixed/20 blur-[100px]" />
      </div>

      <div className="w-full max-w-[460px] space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary">HepYonet</h1>
          <p className="text-on-surface-variant text-sm font-medium tracking-wide">RESTAURANT MANAGEMENT</p>
        </div>

        {/* Main Card */}
        <div className="bg-surface-container-lowest shadow-[0_20px_40px_rgba(25,28,30,0.06)] rounded-xl overflow-hidden">
          <div className="p-8 md:p-10 space-y-6">
            {/* Header */}
            <div className="space-y-1 text-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Yeni Hesap Oluştur</h2>
              <p className="text-on-surface-variant text-sm">İşletmenizi yönetmeye bugün başlayın.</p>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-medium py-3 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Google ile kayıt ol</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-outline-variant/30" />
              <span className="flex-shrink mx-4 text-outline text-xs font-semibold tracking-widest uppercase">veya</span>
              <div className="flex-grow border-t border-outline-variant/30" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1" htmlFor="full_name">Ad Soyad</label>
                <input
                  {...register("name")}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50 text-on-surface outline-none"
                  id="full_name"
                  placeholder="John Doe"
                  type="text"
                />
                {errors.name && <p className="text-xs text-error mt-1">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1" htmlFor="reg_email">E-posta</label>
                <input
                  {...register("email")}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50 text-on-surface outline-none"
                  id="reg_email"
                  placeholder="ornek@eposta.com"
                  type="email"
                />
                {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1" htmlFor="reg_password">Şifre</label>
                <div className="relative">
                  <input
                    {...register("password")}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50 text-on-surface outline-none"
                    id="reg_password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant cursor-pointer"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-on-surface-variant/70 ml-1">En az 6 karakter olmalıdır.</p>
                {errors.password && <p className="text-xs text-error mt-1">{errors.password.message}</p>}
              </div>

              {/* Restaurant Name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1" htmlFor="restaurant_name">Restoran Adı</label>
                  <span className="text-[10px] text-outline font-medium italic mr-1">İsteğe bağlı</span>
                </div>
                <input
                  {...register("restaurantName")}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50 text-on-surface outline-none"
                  id="restaurant_name"
                  placeholder="Lezzet Durağı"
                  type="text"
                />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 px-1">
                <div className="mt-1">
                  <input
                    {...register("terms")}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                    id="terms"
                    type="checkbox"
                  />
                </div>
                <label className="text-xs text-on-surface-variant leading-relaxed" htmlFor="terms">
                  <Link href="/privacy" className="text-on-surface font-semibold hover:underline">Kullanım Koşulları</Link> ve{" "}
                  <Link href="/privacy" className="text-on-surface font-semibold hover:underline">Gizlilik Politikası</Link>&apos;nı okudum ve kabul ediyorum.
                </label>
              </div>
              {errors.terms && <p className="text-xs text-error px-1">{errors.terms.message}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-3.5 rounded-lg shadow-lg shadow-primary/10 transition-all duration-200 font-headline tracking-wide disabled:opacity-50"
              >
                {isLoading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-surface-container-low p-6 text-center">
            <p className="text-sm text-on-surface-variant">
              Zaten hesabın var mı?{" "}
              <Link href="/auth/login" className="text-primary font-bold ml-1 hover:underline">Giriş Yap</Link>
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <span className="material-symbols-outlined text-outline text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <p className="text-[10px] font-bold text-outline-variant uppercase">Güvenli Veri</p>
          </div>
          <div className="space-y-1">
            <span className="material-symbols-outlined text-outline text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>cloud</span>
            <p className="text-[10px] font-bold text-outline-variant uppercase">Bulut Tabanlı</p>
          </div>
          <div className="space-y-1">
            <span className="material-symbols-outlined text-outline text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
            <p className="text-[10px] font-bold text-outline-variant uppercase">7/24 Destek</p>
          </div>
        </div>
      </div>
    </div>
  )
}
