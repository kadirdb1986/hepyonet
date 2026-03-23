"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, addMonths, subMonths } from "date-fns"
import { tr } from "date-fns/locale"
import api from "@/lib/api"
import { formatCurrency, cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyBreakdown {
  date: string
  revenue: number
  expense: number
}

interface MonthlySummary {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  dailyBreakdown: DailyBreakdown[]
  categoryBreakdown: Record<string, number>
  dailyRevenues: { id: string; date: string; amount: number }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DONUT_COLORS = [
  "#6750A4",
  "#625B71",
  "#7D5260",
  "#006C4C",
  "#B3261E",
  "#1D6CB0",
  "#795548",
  "#FF6F00",
]

function buildDonutPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  }
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  }
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("bg-black/[0.06] rounded-md animate-pulse", className)} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceOverviewPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [chartTab, setChartTab] = useState<"daily" | "weekly">("daily")

  const month = format(currentDate, "yyyy-MM")
  const monthDisplay = format(currentDate, "MMMM yyyy", { locale: tr })

  const { data: summary, isLoading } = useQuery<MonthlySummary>({
    queryKey: ["finance-summary", month],
    queryFn: () =>
      api.get(`/revenues/summary/monthly?month=${month}`).then((r) => r.data),
  })

  const goToPreviousMonth = () => setCurrentDate((d) => subMonths(d, 1))
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1))

  // ─── Chart data ───────────────────────────────────────────────────────

  const dailyData = summary?.dailyBreakdown ?? []

  const weeklyData = useMemo(() => {
    if (!dailyData.length) return []
    const weeks: { label: string; revenue: number }[] = []
    let weekRevenue = 0
    let weekStart = ""
    dailyData.forEach((d, i) => {
      if (i % 7 === 0) {
        if (i > 0) {
          weeks.push({ label: weekStart, revenue: weekRevenue })
        }
        weekStart = format(new Date(d.date), "d MMM", { locale: tr })
        weekRevenue = 0
      }
      weekRevenue += d.revenue
    })
    if (weekStart) {
      weeks.push({ label: weekStart, revenue: weekRevenue })
    }
    return weeks
  }, [dailyData])

  const chartData = chartTab === "daily" ? dailyData : weeklyData
  const maxChartValue = Math.max(
    ...chartData.map((d) => ("revenue" in d ? d.revenue : 0)),
    1,
  )

  // ─── Donut ────────────────────────────────────────────────────────────

  const categoryBreakdownRaw = summary?.categoryBreakdown ?? {}
  const categoryBreakdown = Object.entries(categoryBreakdownRaw).map(([category, amount]) => ({
    category,
    amount: Number(amount),
  }))
  const totalExpenseForDonut = categoryBreakdown.reduce((a, c) => a + c.amount, 0) || 1

  // ─── Daily table (revenue, expense, net) ──────────────────────────────

  const dailyTableData = dailyData.map((d) => ({
    date: d.date,
    revenue: d.revenue,
    expense: d.expense ?? 0,
    net: d.revenue - (d.expense ?? 0),
  }))

  // ─── Sparkline data for cards ─────────────────────────────────────────

  const last7Days = dailyData.slice(-7)
  const revenueSparkline = last7Days.map((d) => d.revenue)
  const expenseSparkline = last7Days.map((d) => d.expense ?? 0)
  const netSparkline = last7Days.map((d) => d.revenue - (d.expense ?? 0))

  function MiniSparkBars({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data, 1)
    return (
      <div className="flex items-end gap-1 h-12 mt-auto">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm min-h-[2px] transition-all"
            style={{
              height: `${Math.max((v / max) * 48, 2)}px`,
              backgroundColor: color,
              opacity: 0.6 + (i / data.length) * 0.4,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
          Finans Genel Bakis
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="text-lg font-bold text-on-surface capitalize min-w-[160px] text-center">
            {monthDisplay}
          </span>
          <button
            onClick={goToNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Toplam Ciro */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] flex flex-col justify-between h-48 border border-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-secondary mb-1">
                <span className="material-symbols-outlined text-xl">trending_up</span>
                <span className="text-xs font-bold uppercase tracking-wider">Toplam Ciro</span>
              </div>
              {isLoading ? (
                <SkeletonBlock className="h-8 w-40 mt-2" />
              ) : (
                <p className="text-3xl font-extrabold text-on-surface font-headline">
                  {formatCurrency(summary?.totalRevenue ?? 0)}
                </p>
              )}
            </div>
          </div>
          <MiniSparkBars data={revenueSparkline.length ? revenueSparkline : [0, 0, 0, 0, 0, 0, 0]} color="var(--color-secondary, #625B71)" />
        </div>

        {/* Toplam Gider */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] flex flex-col justify-between h-48 border border-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-error mb-1">
                <span className="material-symbols-outlined text-xl">trending_down</span>
                <span className="text-xs font-bold uppercase tracking-wider">Toplam Gider</span>
              </div>
              {isLoading ? (
                <SkeletonBlock className="h-8 w-40 mt-2" />
              ) : (
                <p className="text-3xl font-extrabold text-on-surface font-headline">
                  {formatCurrency(summary?.totalExpenses ?? 0)}
                </p>
              )}
            </div>
          </div>
          <MiniSparkBars data={expenseSparkline.length ? expenseSparkline : [0, 0, 0, 0, 0, 0, 0]} color="var(--color-error, #B3261E)" />
        </div>

        {/* Net Gelir */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] flex flex-col justify-between h-48 border border-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                <span className="text-xs font-bold uppercase tracking-wider">Net Gelir</span>
              </div>
              {isLoading ? (
                <SkeletonBlock className="h-8 w-40 mt-2" />
              ) : (
                <p className="text-3xl font-extrabold text-on-surface font-headline">
                  {formatCurrency(summary?.netIncome ?? 0)}
                </p>
              )}
            </div>
          </div>
          <MiniSparkBars data={netSparkline.length ? netSparkline : [0, 0, 0, 0, 0, 0, 0]} color="var(--color-primary, #6750A4)" />
        </div>
      </div>

      {/* Analysis Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">
                Gelir Performansi
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {monthDisplay} - {chartTab === "daily" ? "gunluk" : "haftalik"} dagilim
              </p>
            </div>
            <div className="flex bg-surface-container rounded-lg p-1 gap-1">
              <button
                onClick={() => setChartTab("daily")}
                className={cn(
                  chartTab === "daily"
                    ? "px-4 py-1.5 bg-surface-container-lowest shadow-sm text-sm font-bold rounded-md"
                    : "px-4 py-1.5 text-on-surface-variant text-sm font-semibold",
                )}
              >
                Gunluk
              </button>
              <button
                onClick={() => setChartTab("weekly")}
                className={cn(
                  chartTab === "weekly"
                    ? "px-4 py-1.5 bg-surface-container-lowest shadow-sm text-sm font-bold rounded-md"
                    : "px-4 py-1.5 text-on-surface-variant text-sm font-semibold",
                )}
              >
                Haftalik
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-end gap-2 h-56">
              {[80, 140, 60, 180, 100, 220, 120, 90, 160, 110].map((h, i) => (
                <div key={i} className="flex-1">
                  <div
                    className="w-full rounded-t-sm bg-black/[0.06] animate-pulse"
                    style={{ height: `${h}px` }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-56">
              {chartData.map((item, idx) => {
                const value = "revenue" in item ? item.revenue : 0
                const barHeight = Math.max((value / maxChartValue) * 224, 4)
                const label =
                  "date" in item
                    ? format(new Date(item.date), "d", { locale: tr })
                    : (item as { label: string }).label

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-on-surface">
                      {formatCurrency(value)}
                    </div>
                    <div
                      className="w-full rounded-t-sm bg-primary/70 group-hover:bg-primary transition-colors cursor-default"
                      style={{ height: `${barHeight}px` }}
                    />
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Donut Chart */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-6">
            Gider Dagilimi
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <SkeletonBlock className="w-40 h-40 rounded-full" />
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2">
                donut_small
              </span>
              <p className="text-xs text-on-surface-variant">Henuz gider verisi yok</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-6">
                <svg viewBox="0 0 200 200" width="160" height="160">
                  {(() => {
                    let startAngle = -Math.PI / 2
                    return categoryBreakdown.map((cat, i) => {
                      const angle = (cat.amount / totalExpenseForDonut) * 2 * Math.PI
                      // Minimum angle for visibility
                      const effectiveAngle = Math.max(angle, 0.05)
                      const path = buildDonutPath(100, 100, 70, startAngle, startAngle + effectiveAngle)
                      startAngle += effectiveAngle
                      return (
                        <path
                          key={cat.category}
                          d={path}
                          fill="none"
                          stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                          strokeWidth="24"
                          strokeLinecap="round"
                        />
                      )
                    })
                  })()}
                  <text
                    x="100"
                    y="95"
                    textAnchor="middle"
                    className="fill-on-surface text-lg font-bold"
                    fontSize="16"
                    fontWeight="800"
                  >
                    {formatCurrency(summary?.totalExpenses ?? 0)}
                  </text>
                  <text
                    x="100"
                    y="115"
                    textAnchor="middle"
                    className="fill-on-surface-variant"
                    fontSize="10"
                  >
                    Toplam Gider
                  </text>
                </svg>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="text-sm text-on-surface-variant truncate max-w-[120px]">
                        {cat.category}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-on-surface">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Daily Detail Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] overflow-hidden border border-white">
        <div className="p-6 border-b border-outline-variant/15">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Gunluk Detay
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Tarih
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                  Ciro
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                  Gider
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                  Net Durum
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><SkeletonBlock className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><SkeletonBlock className="h-4 w-20 ml-auto" /></td>
                    <td className="px-6 py-4"><SkeletonBlock className="h-4 w-20 ml-auto" /></td>
                    <td className="px-6 py-4"><SkeletonBlock className="h-4 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : dailyTableData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                    Bu ay icin veri bulunamadi
                  </td>
                </tr>
              ) : (
                dailyTableData.map((row) => (
                  <tr key={row.date} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-on-surface">
                      {format(new Date(row.date), "d MMMM EEEE", { locale: tr })}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-on-surface text-right">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-error text-right">
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 text-sm font-bold text-right",
                        row.net >= 0 ? "text-secondary" : "text-error",
                      )}
                    >
                      {row.net >= 0 ? "+" : ""}
                      {formatCurrency(row.net)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
