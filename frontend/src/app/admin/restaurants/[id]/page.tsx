"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestaurantMember {
  id: string
  userId: string
  role: string
  isActive: boolean
  user: {
    id: string
    email: string
    name: string
  }
}

interface RestaurantDetail {
  id: string
  name: string
  slug: string
  address?: string
  phone?: string
  status: "APPROVED" | "PENDING" | "REJECTED"
  createdAt: string
  members?: RestaurantMember[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Sahip",
  ADMIN: "Yönetici",
  ACCOUNTANT: "Muhasebe",
  HR: "İnsan Kaynakları",
  STOCK_MANAGER: "Depocu",
  MENU_MANAGER: "Menü Yöneticisi",
  WAITER: "Garson",
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RestaurantDetail["status"] }) {
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

export default function AdminRestaurantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const restaurantId = params.id as string

  const { data: restaurants = [], isLoading } = useQuery<RestaurantDetail[]>({
    queryKey: ["admin-restaurants"],
    queryFn: () => api.get("/admin/restaurants").then((r) => r.data),
  })

  const restaurant = restaurants.find((r) => r.id === restaurantId)

  const approveMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/admin/restaurants/${restaurantId}/approve`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      toast.success("Restoran durumu güncellendi")
    },
    onError: () => {
      toast.error("İşlem başarısız")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      api.delete(`/admin/restaurants/${restaurantId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      toast.success("Restoran silindi")
      router.push("/admin/restaurants")
    },
    onError: () => {
      toast.error("Restoran silinemedi")
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-black/[0.06] rounded-md animate-pulse" />
        <div className="bg-surface-container-lowest rounded-2xl p-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-black/[0.06] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">
            Restoran Bulunamadı
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Aradığınız restoran mevcut değil veya silinmiş olabilir.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/restaurants")}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Restoranlara Dön
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/restaurants")}
        className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Restoranlara Dön
      </button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">
            {restaurant.name}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {restaurant.slug}
          </p>
        </div>
        <StatusBadge status={restaurant.status} />
      </div>

      {/* Info Card */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-6">
          Restoran Bilgileri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ad</p>
            <p className="text-sm text-on-surface">{restaurant.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Slug</p>
            <p className="text-sm text-on-surface">{restaurant.slug}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Adres</p>
            <p className="text-sm text-on-surface">{restaurant.address || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Telefon</p>
            <p className="text-sm text-on-surface">{restaurant.phone || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sahip</p>
            <p className="text-sm text-on-surface">
              {restaurant.members?.find((m) => m.role === "OWNER")?.user.email ?? "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Oluşturma Tarihi</p>
            <p className="text-sm text-on-surface">{formatDate(restaurant.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Members Card */}
      {restaurant.members && restaurant.members.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-8">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-6">
            Üyeler ({restaurant.members.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  <th className="pb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">E-posta</th>
                  <th className="pb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ad</th>
                  <th className="pb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Rol</th>
                  <th className="pb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {restaurant.members.map((member) => (
                  <tr key={member.userId}>
                    <td className="py-3 text-sm text-on-surface">{member.user.email}</td>
                    <td className="py-3 text-sm text-on-surface">{member.user.name || "—"}</td>
                    <td className="py-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface">
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-full",
                          member.isActive
                            ? "bg-secondary-fixed text-on-secondary-fixed"
                            : "bg-error-container text-on-error-container"
                        )}
                      >
                        {member.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {restaurant.status === "PENDING" && (
          <>
            <button
              onClick={() => approveMutation.mutate("APPROVED")}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              Onayla
            </button>
            <button
              onClick={() => approveMutation.mutate("REJECTED")}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-error-container text-on-error-container font-bold text-sm rounded-xl hover:opacity-80 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Reddet
            </button>
          </>
        )}
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-error text-on-error font-bold text-sm rounded-xl hover:opacity-80 transition-all ml-auto"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          Sil
        </button>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Restoranı Sil</DialogTitle>
            <DialogDescription>
              <strong>{restaurant.name}</strong> restoranını silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz ve tüm ilişkili veriler silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
            >
              İptal
            </DialogClose>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-error text-on-error font-bold text-sm rounded-lg hover:opacity-80 transition-all disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
