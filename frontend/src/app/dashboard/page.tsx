"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { format, subMonths, getDay, endOfMonth } from "date-fns"
import { tr } from "date-fns/locale"
import api from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatCurrency, cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyBreakdown {
  day: number
  date: string
  revenue: number
  expense: number
  net: number
}

interface FinanceSummary {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  dailyBreakdown: DailyBreakdown[]
  categoryBreakdown: Record<string, number>
}

interface PersonnelItem {
  id: string
  isActive: boolean
}

interface RecentExpense {
  id: string
  title: string
  amount: number
  category: string
  paymentDate: string
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
  iconBgClass: string
  cardBgClass?: string
  badge: React.ReactNode
  isLoading?: boolean
}

function KpiCard({ title, value, icon, iconBgClass, cardBgClass, badge, isLoading }: KpiCardProps) {
  return (
    <div
      className={cn(
        "p-6 rounded-xl border-0 ring-1 ring-black/[0.03] transition-all hover:translate-y-[-4px]",
        cardBgClass || "bg-surface-container-lowest",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2 rounded-lg", iconBgClass)}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        {badge}
      </div>
      <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
      {isLoading ? (
        <div className="h-8 w-3/4 bg-black/[0.06] rounded-md animate-pulse" />
      ) : (
        <p className="font-headline text-2xl font-bold text-on-surface">{value}</p>
      )}
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

function BarChart({ data }: { data: DailyBreakdown[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const maxRevenueDay = data.reduce((max, d) => (d.revenue > max.revenue ? d : max), data[0])

  return (
    <div className="flex items-end justify-between gap-4 px-2 pt-7">
      {data.map((item) => {
        const dayIndex = getDay(new Date(item.date))
        const dayName = TR_DAY_NAMES[dayIndex]
        const isHighest = item.date === maxRevenueDay?.date && item.revenue > 0
        const barHeight = Math.max((item.revenue / maxRevenue) * 160, 4)

        return (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full" style={{ height: `${barHeight}px` }}>
              {isHighest && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                  {formatCurrency(item.revenue)}
                </div>
              )}
              <div
                className={cn(
                  "w-full h-full rounded-t-sm transition-colors",
                  isHighest
                    ? "bg-primary"
                    : "bg-surface-container-high group-hover:bg-primary-container/20",
                )}
              />
            </div>
            <span className={cn(
              "text-[10px] font-bold",
              isHighest ? "text-on-surface" : "text-on-surface-variant"
            )}>{dayName}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

function WeeklyBarChart({ data }: { data: { label: string; revenue: number }[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const maxItem = data.reduce((max, d) => (d.revenue > max.revenue ? d : max), data[0])

  return (
    <div className="flex items-end justify-between gap-6 px-2 pt-7">
      {data.map((item, idx) => {
        const isHighest = item === maxItem && item.revenue > 0
        const barHeight = Math.max((item.revenue / maxRevenue) * 160, 4)

        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full" style={{ height: `${barHeight}px` }}>
              {isHighest && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                  {formatCurrency(item.revenue)}
                </div>
              )}
              <div
                className={cn(
                  "w-full h-full rounded-t-sm transition-colors",
                  isHighest
                    ? "bg-primary"
                    : "bg-surface-container-high group-hover:bg-primary-container/20",
                )}
              />
            </div>
            <span className={cn(
              "text-[10px] font-bold",
              isHighest ? "text-on-surface" : "text-on-surface-variant"
            )}>{item.label}</span>
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

  const { data: recentExpenses = [] } = useQuery<RecentExpense[]>({
    queryKey: ["recent-expenses", currentMonth],
    queryFn: () => {
      const start = format(new Date(currentMonth + "-01"), "yyyy-MM-dd")
      const end = format(endOfMonth(new Date(currentMonth + "-01")), "yyyy-MM-dd")
      return api.get(`/expenses?startDate=${start}&endDate=${end}`).then((r) =>
        (r.data || []).sort((a: RecentExpense, b: RecentExpense) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        ).slice(0, 4)
      )
    },
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

  // Chart data: last 7 days that have passed in the current month
  const dailyData: DailyBreakdown[] = (() => {
    const raw = currentSummary?.dailyBreakdown ?? []
    const todayDay = new Date().getDate()
    const upToToday = raw.filter((d) => d.day <= todayDay)
    return upToToday.slice(-7)
  })()

  // Weekly data: group dailyBreakdown by week
  const weeklyData = (() => {
    const raw = currentSummary?.dailyBreakdown ?? []
    if (!raw.length) return []
    const weeks: { label: string; revenue: number; date: string; day: number; expense: number; net: number }[] = []
    for (let i = 0; i < raw.length; i += 7) {
      const chunk = raw.slice(i, i + 7)
      const weekRevenue = chunk.reduce((sum, d) => sum + d.revenue, 0)
      const weekExpense = chunk.reduce((sum, d) => sum + d.expense, 0)
      const startDay = chunk[0].day
      const endDay = chunk[chunk.length - 1].day
      weeks.push({
        label: `${startDay}-${endDay}`,
        revenue: weekRevenue,
        expense: weekExpense,
        net: weekRevenue - weekExpense,
        date: chunk[0].date,
        day: startDay,
      })
    }
    return weeks
  })()

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">
          Merhaba, {user?.name?.split(" ")[0] ?? "Kullanıcı"}
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
          iconBgClass="bg-primary-fixed text-on-primary-fixed"
          isLoading={summaryLoading}
          badge={<ChangeBadge change={revenueChange} variant="secondary-container" />}
        />

        {/* Aylık Gider */}
        <KpiCard
          title="Aylık Gider"
          value={formatCurrency(currentSummary?.totalExpenses ?? 0)}
          icon="receipt_long"
          iconBgClass="bg-surface-container-highest text-on-surface"
          isLoading={summaryLoading}
          badge={<ChangeBadge change={expenseChange} variant="error-container" />}
        />

        {/* Brüt Kar */}
        <KpiCard
          title="Brüt Kar"
          value={formatCurrency(currentSummary?.netIncome ?? 0)}
          icon="account_balance_wallet"
          iconBgClass="bg-slate-200 text-slate-700"
          cardBgClass="bg-slate-100"
          isLoading={summaryLoading}
          badge={<ChangeBadge change={netChange} variant="secondary" />}
        />

        {/* Personel */}
        <KpiCard
          title="Personel Sayısı"
          value={activeStaff ? `${activeStaff} Aktif` : "—"}
          icon="badge"
          iconBgClass="bg-tertiary-fixed text-on-tertiary-fixed"
          isLoading={!personnel}
          badge={
            activeStaff > 0 && totalStaff > 0 && activeStaff === totalStaff ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                Kadro Tam
              </span>
            ) : activeStaff > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                {activeStaff}/{totalStaff}
              </span>
            ) : null
          }
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue Chart — 8 cols */}
        <div className="lg:col-span-8 self-start bg-surface-container-lowest p-6 rounded-xl border-0 ring-1 ring-black/[0.03]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Gelir Trendi</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {format(new Date(), "MMMM yyyy", { locale: tr })} — {chartTab === "daily" ? "günlük" : "haftalık"} dağılım
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
            <div className="flex items-end gap-2">
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
          ) : chartTab === "daily" ? (
            <BarChart data={dailyData} />
          ) : (
            <WeeklyBarChart data={weeklyData} />
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
          <div className="flex-1 bg-surface-container-low p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-base font-bold text-on-surface">Son Giderler</h3>
              <Link href="/dashboard/finance/expenses" className="text-xs font-bold text-primary hover:underline">Tümü</Link>
            </div>
            {summaryLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <SkeletonBlock className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="h-3 w-16" />
                    </div>
                    <SkeletonBlock className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentExpenses.length > 0 ? (
              <div className="space-y-4">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-outline-variant/10 shadow-sm">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">receipt</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface leading-tight">{expense.title}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {format(new Date(expense.paymentDate), "d MMM", { locale: tr })} · {expense.category}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-on-surface">-{formatCurrency(expense.amount)}</span>
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
