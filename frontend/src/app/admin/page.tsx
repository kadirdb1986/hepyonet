"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalRestaurants: number
  pendingRestaurants: number
  approvedRestaurants: number
  totalUsers: number
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number | string
  icon: string
  bgClass: string
  isLoading?: boolean
}

function StatCard({ title, value, icon, bgClass, isLoading }: StatCardProps) {
  return (
    <div
      className={cn(
        "p-6 rounded-xl border-0 ring-1 ring-black/[0.03] transition-all hover:translate-y-[-4px]",
        bgClass
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="material-symbols-outlined text-on-surface-variant text-2xl">{icon}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-3/4 bg-black/[0.06] rounded-md animate-pulse mb-1" />
      ) : (
        <p className="font-headline text-3xl font-bold text-on-surface leading-tight">
          {value}
        </p>
      )}
      <p className="text-xs font-medium text-on-surface-variant mt-1">{title}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">
          Admin Dashboard
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Platform istatistikleri
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Restoran"
          value={stats?.totalRestaurants ?? 0}
          icon="storefront"
          bgClass="bg-primary-fixed"
          isLoading={isLoading}
        />
        <StatCard
          title="Bekleyen Başvuru"
          value={stats?.pendingRestaurants ?? 0}
          icon="pending_actions"
          bgClass="bg-tertiary-fixed"
          isLoading={isLoading}
        />
        <StatCard
          title="Onaylı Restoran"
          value={stats?.approvedRestaurants ?? 0}
          icon="verified"
          bgClass="bg-secondary-container"
          isLoading={isLoading}
        />
        <StatCard
          title="Toplam Kullanıcı"
          value={stats?.totalUsers ?? 0}
          icon="group"
          bgClass="bg-surface-container-highest"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
