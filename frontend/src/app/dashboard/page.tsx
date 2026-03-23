"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, subMonths, getDay } from "date-fns"
import { tr } from "date-fns/locale"
import api from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRevenue {
  date: string
  revenue: number
}

interface FinanceSummary {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  dailyBreakdown: DailyRevenue[]
  categoryBreakdown: { category: string; amount: number }[]
}

interface PersonnelItem {
  id: string
  isActive: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcChange = (current: number, previous: number): number => {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

const TR_DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string
  value: string
  icon: string
  bgClass: string
  badge: React.ReactNode
  isLoading?: boolean
}

function KpiCard({ title, value, icon, bgClass, badge, isLoading }: KpiCardProps) {
  return (
    <div
      className={cn(
        "p-6 rounded-xl border-0 ring-1 ring-black/[0.03] transition-all hover:translate-y-[-4px]",
        bgClass,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="material-symbols-outlined text-on-surface-variant text-2xl">{icon}</span>
        {badge}
      </div>
      {isLoading ? (
        <div className="h-8 w-3/4 bg-black/[0.06] rounded-md animate-pulse mb-1" />
      ) : (
        <p className="font-headline text-2xl font-bold text-on-surface leading-tight">{value}</p>
      )}
      <p className="text-xs font-medium text-on-surface-variant mt-1">{title}</p>
    </div>
  )
}

// ─── Change Badge ─────────────────────────────────────────────────────────────

interface ChangeBadgeProps {
  change: number
  variant?: "secondary-container" | "error-container" | "secondary"
}

function ChangeBadge({ change, variant = "secondary-container" }: ChangeBadgeProps) {
  const sign = change >= 0 ? "+" : ""
  const bgClass =
    variant === "error-container"
      ? "bg-error-container text-on-error-container"
      : variant === "secondary"
        ? "bg-secondary text-on-secondary"
        : "bg-secondary-container text-on-secondary-container"

  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", bgClass)}>
      {sign}{change}%
    </span>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: DailyRevenue[]
}

function BarChart({ data }: BarChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const today = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="flex items-end gap-2 h-56 w-full">
      {data.map((item) => {
        const dayIndex = getDay(new Date(item.date))
        const dayName = TR_DAY_NAMES[dayIndex]
        const isToday = item.date === today
        const barHeight = Math.max((item.revenue / maxRevenue) * 224, 4)

        return (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-3 group">
            <div
              className={cn(
                "w-full rounded-t-sm transition-colors",
                isToday
                  ? "bg-primary"
                  : "bg-surface-container-high group-hover:bg-primary-container/20",
              )}
              style={{ height: `${barHeight}px` }}
            />
            <span className="text-[10px] font-bold text-on-surface-variant">{dayName}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeleton Placeholder ─────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("bg-black/[0.06] rounded-md animate-pulse", className)} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const [chartTab, setChartTab] = useState<"daily" | "weekly">("daily")

  const currentMonth = format(new Date(), "yyyy-MM")
  const previousMonth = format(subMonths(new Date(), 1), "yyyy-MM")

  const { data: currentSummary, isLoading: summaryLoading } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary", currentMonth],
    queryFn: () =>
      api.get(`/revenues/summary/monthly?month=${currentMonth}`).then((r) => r.data),
  })

  const { data: previousSummary } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary", previousMonth],
    queryFn: () =>
      api.get(`/revenues/summary/monthly?month=${previousMonth}`).then((r) => r.data),
  })

  const { data: personnel } = useQuery<PersonnelItem[]>({
    queryKey: ["personnel"],
    queryFn: () => api.get("/personnel").then((r) => r.data),
  })

  const todayLong = format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })

  const revenueChange = calcChange(
    currentSummary?.totalRevenue ?? 0,
    previousSummary?.totalRevenue ?? 0,
  )
  const expenseChange = calcChange(
    currentSummary?.totalExpenses ?? 0,
    previousSummary?.totalExpenses ?? 0,
  )
  const netChange = calcChange(
    currentSummary?.netIncome ?? 0,
    previousSummary?.netIncome ?? 0,
  )

  const activeStaff = personnel?.filter((p) => p.isActive).length ?? 0
  const totalStaff = personnel?.length ?? 0

  // Chart data: last 7 daily entries or build 7-slot array
  const dailyData: DailyRevenue[] = (() => {
    const raw = currentSummary?.dailyBreakdown ?? []
    if (raw.length >= 7) return raw.slice(-7)
    // Pad from start with zero entries
    const today = new Date()
    const padded: DailyRevenue[] = []
    for (let i = 6; i >= 0; i--) {
      const d = subMonths(today, 0)
      d.setDate(today.getDate() - i)
      const dateStr = format(d, "yyyy-MM-dd")
      const found = raw.find((r) => r.date === dateStr)
      padded.push({ date: dateStr, revenue: found?.revenue ?? 0 })
    }
    return padded
  })()

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">
          Merhaba, {user?.name?.split(" ")[0] ?? "Kullanıcı"} 👋
        </h1>
        <p className="text-sm text-on-surface-variant mt-1 capitalize">{todayLong}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Aylık Ciro */}
        <KpiCard
          title="Aylık Ciro"
          value={formatCurrency(currentSummary?.totalRevenue ?? 0)}
          icon="payments"
          bgClass="bg-primary-fixed"
          isLoading={summaryLoading}
          badge={<ChangeBadge change={revenueChange} variant="secondary-container" />}
        />

        {/* Aylık Gider */}
        <KpiCard
          title="Aylık Gider"
          value={formatCurrency(currentSummary?.totalExpenses ?? 0)}
          icon="receipt_long"
          bgClass="bg-surface-container-highest"
          isLoading={summaryLoading}
          badge={<ChangeBadge change={expenseChange} variant="error-container" />}
        />

        {/* Brüt Kar */}
        <KpiCard
          title="Brüt Kar"
          value={formatCurrency(currentSummary?.netIncome ?? 0)}
          icon="account_balance_wallet"
          bgClass="bg-slate-100"
          isLoading={summaryLoading}
          badge={<ChangeBadge change={netChange} variant="secondary" />}
        />

        {/* Personel */}
        <KpiCard
          title="Aktif Personel"
          value={activeStaff ? String(activeStaff) : "—"}
          icon="badge"
          bgClass="bg-tertiary-fixed"
          isLoading={!personnel}
          badge={
            activeStaff > 0 && totalStaff > 0 && activeStaff === totalStaff ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                Kadro Tam
              </span>
            ) : activeStaff > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container">
                {activeStaff}/{totalStaff}
              </span>
            ) : null
          }
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue Chart — 8 cols */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-xl border-0 ring-1 ring-black/[0.03]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Gelir Trendi</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {format(new Date(), "MMMM yyyy", { locale: tr })} — günlük dağılım
              </p>
            </div>
            {/* Tab Toggle */}
            <div className="flex bg-surface-container rounded-full p-0.5 gap-0.5">
              <button
                onClick={() => setChartTab("daily")}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                  chartTab === "daily"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Günlük
              </button>
              <button
                onClick={() => setChartTab("weekly")}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                  chartTab === "weekly"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Haftalık
              </button>
            </div>
          </div>

          {/* Chart */}
          {summaryLoading ? (
            <div className="flex items-end gap-2 h-56">
              {[80, 140, 60, 180, 100, 220, 120].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                  <div
                    className="w-full rounded-t-sm bg-black/[0.06] animate-pulse"
                    style={{ height: `${h}px` }}
                  />
                  <SkeletonBlock className="h-3 w-6" />
                </div>
              ))}
            </div>
          ) : (
            <BarChart data={dailyData} />
          )}

          {/* Y-axis hint */}
          {!summaryLoading && currentSummary && (
            <div className="mt-4 flex justify-between">
              <p className="text-[11px] text-on-surface-variant">
                Toplam:{" "}
                <span className="font-semibold text-on-surface">
                  {formatCurrency(currentSummary.totalRevenue)}
                </span>
              </p>
              <p className="text-[11px] text-on-surface-variant">
                En yüksek gün:{" "}
                <span className="font-semibold text-on-surface">
                  {formatCurrency(
                    Math.max(...dailyData.map((d) => d.revenue), 0),
                  )}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Side Panel — 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Son Giderler */}
          <div className="flex-1 bg-surface-container-lowest p-6 rounded-xl border-0 ring-1 ring-black/[0.03]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-base font-bold text-on-surface">Son Giderler</h3>
              <span className="material-symbols-outlined text-on-surface-variant text-xl">
                receipt_long
              </span>
            </div>
            {summaryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : currentSummary?.categoryBreakdown?.length ? (
              <div className="space-y-3">
                {currentSummary.categoryBreakdown.slice(0, 4).map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant truncate max-w-[60%]">
                      {item.category}
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2">
                  inbox
                </span>
                <p className="text-xs text-on-surface-variant">Henüz gider kaydı yok</p>
              </div>
            )}
          </div>

          {/* Yaklaşan İzinler */}
          <div className="flex-1 bg-surface-container-lowest p-6 rounded-xl border-0 ring-1 ring-black/[0.03]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-base font-bold text-on-surface">
                Yaklaşan İzinler
              </h3>
              <span className="material-symbols-outlined text-on-surface-variant text-xl">
                event_available
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2">
                beach_access
              </span>
              <p className="text-xs text-on-surface-variant">Yaklaşan izin bulunmuyor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
