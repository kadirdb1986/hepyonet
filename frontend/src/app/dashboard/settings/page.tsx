"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Restaurant {
  id: string
  name: string
  slug: string
  logo?: string
  address?: string
  phone?: string
  status: "APPROVED" | "PENDING" | "REJECTED"
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  name: z.string().min(1, "Restoran adı gerekli"),
  logo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
})

type SettingsForm = z.infer<typeof settingsSchema>

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Restaurant["status"] }) {
  const config = {
    APPROVED: {
      label: "Onaylı",
      className: "bg-secondary-fixed text-on-secondary-fixed",
      icon: "check_circle",
    },
    PENDING: {
      label: "Beklemede",
      className: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
      icon: "schedule",
    },
    REJECTED: {
      label: "Reddedildi",
      className: "bg-error-container text-on-error-container",
      icon: "cancel",
    },
  }

  const { label, className, icon } = config[status] || config.PENDING

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold", className)}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient()

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ["restaurant-current"],
    queryFn: () => api.get("/restaurants/current").then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    if (restaurant) {
      reset({
        name: restaurant.name,
        logo: restaurant.logo || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
      })
    }
  }, [restaurant, reset])

  const updateMutation = useMutation({
    mutationFn: (data: SettingsForm) =>
      api.patch("/restaurants/current", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-current"] })
      toast.success("Ayarlar başarıyla kaydedildi")
    },
    onError: () => {
      toast.error("Ayarlar kaydedilemedi")
    },
  })

  const onSubmit = (data: SettingsForm) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-48 bg-black/[0.06] rounded-md animate-pulse" />
          <div className="h-4 w-64 bg-black/[0.06] rounded-md animate-pulse mt-2" />
        </div>
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-10 w-full bg-black/[0.06] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Ayarlar</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Restoran bilgilerini düzenleyin
          </p>
        </div>
        {restaurant && <StatusBadge status={restaurant.status} />}
      </div>

      {/* Form */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          {/* Restoran Adı */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">store</span>
              Restoran Adı
            </label>
            <input
              {...register("name")}
              className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none"
              placeholder="Restoran adını girin"
            />
            {errors.name && (
              <p className="text-xs text-error mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Slug (read-only) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">link</span>
              Slug
            </label>
            <input
              value={restaurant?.slug || ""}
              disabled
              className="w-full px-4 py-3 bg-surface-container-high border-none rounded-xl text-on-surface-variant cursor-not-allowed opacity-60"
            />
            <p className="text-xs text-on-surface-variant">
              Slug otomatik oluşturulur ve değiştirilemez
            </p>
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">image</span>
              Logo URL
            </label>
            <input
              {...register("logo")}
              className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Adres */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              Adres
            </label>
            <textarea
              {...register("address")}
              rows={3}
              className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none resize-none"
              placeholder="Restoran adresini girin"
            />
          </div>

          {/* Telefon */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">phone</span>
              Telefon
            </label>
            <input
              {...register("phone")}
              className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none"
              placeholder="0 (5XX) XXX XX XX"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-black/10 hover:shadow-black/20 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Kaydet
                </>
              )}
            </button>
            {isDirty && (
              <p className="text-xs text-on-surface-variant">
                Kaydedilmemiş değişiklikler var
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
