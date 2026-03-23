"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format, subMonths } from "date-fns"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn, formatCurrency, formatCurrencyDecimal } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ChartContainer } from "@/components/ui/chart"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueItem {
  date: string
  amount: number
  notes?: string
}

interface ExpenseGroup {
  category: string
  amount: number
  items: { description: string; amount: number }[]
}

interface ReportData {
  period: string
  revenues: RevenueItem[]
  expenses: ExpenseGroup[]
  totalRevenue: number
  totalExpenses: number
  taxRate: number
  taxAmount: number
  netProfit: number
}

interface CompareData {
  periods: string[]
  data: {
    period: string
    revenue: number
    expenses: number
    tax: number
    netProfit: number
    profitMargin: number
    categories: Record<string, number>
  }[]
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

interface EditableCellProps {
  value: number
  originalValue: number
  onChange: (val: number) => void
}

function EditableCell({ value, originalValue, onChange }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState("")
  const isEdited = value !== originalValue

  const startEdit = () => {
    setTempValue(String(value).replace(".", ","))
    setEditing(true)
  }

  const saveEdit = () => {
    const parsed = parseFloat(tempValue.replace(",", "."))
    if (!isNaN(parsed)) {
      onChange(parsed)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={saveEdit}
        onKeyDown={handleKeyDown}
        className="w-24 px-2 py-1 bg-surface-container-low rounded-md text-sm text-right outline-none focus:ring-2 focus:ring-primary/30"
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-sm text-right transition-colors font-medium tabular-nums",
        isEdited
          ? "bg-amber-100 text-amber-900"
          : "hover:bg-surface-container-low text-on-surface"
      )}
    >
      {formatCurrencyDecimal(value)}
      {isEdited && (
        <span className="material-symbols-outlined text-[14px] text-amber-600">edit</span>
      )}
    </button>
  )
}

// ─── Period Report Tab ────────────────────────────────────────────────────────

function PeriodReportTab({
  periodType,
}: {
  periodType: "monthly" | "weekly"
}) {
  const isMonthly = periodType === "monthly"
  const defaultPeriod = isMonthly
    ? format(new Date(), "yyyy-MM")
    : format(new Date(), "yyyy-'W'ww")

  const [period, setPeriod] = useState(defaultPeriod)
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [expenseEdits, setExpenseEdits] = useState<Record<string, number>>({})
  const [taxRateOverride, setTaxRateOverride] = useState<number | null>(null)

  const endpoint = isMonthly
    ? `/reports/monthly?month=${period}`
    : `/reports/weekly?week=${period}`

  const { data: report, isLoading } = useQuery<ReportData>({
    queryKey: [isMonthly ? "report-monthly" : "report-weekly", period],
    queryFn: () => api.get(endpoint).then((r) => r.data),
  })

  const exportMutation = useMutation({
    mutationFn: (exportFormat: "pdf" | "html") =>
      api.post("/reports/generate", { period, format: exportFormat }).then((r) => r.data),
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank")
      }
      toast.success("Rapor oluşturuldu")
    },
    onError: () => {
      toast.error("Rapor oluşturulamadı")
    },
  })

  const resetEdits = () => {
    setEdits({})
    setExpenseEdits({})
    setTaxRateOverride(null)
  }

  const hasEdits = Object.keys(edits).length > 0 || Object.keys(expenseEdits).length > 0 || taxRateOverride !== null

  // Compute edited totals
  const totalRevenue = useMemo(() => {
    if (!report) return 0
    return report.revenues.reduce((sum, item) => {
      const editKey = `rev-${item.date}`
      return sum + (edits[editKey] ?? item.amount)
    }, 0)
  }, [report, edits])

  const totalExpenses = useMemo(() => {
    if (!report) return 0
    return report.expenses.reduce((sum, group) => {
      const editKey = `exp-${group.category}`
      return sum + (expenseEdits[editKey] ?? group.amount)
    }, 0)
  }, [report, expenseEdits])

  const taxRate = taxRateOverride ?? report?.taxRate ?? 20
  const taxAmount = totalRevenue * (taxRate / 100)
  const netProfit = totalRevenue - totalExpenses - taxAmount

  if (isLoading) {
    return (
      <div className="space-y-6 mt-6">
        <div className="h-10 w-48 bg-black/[0.06] rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-black/[0.06] rounded animate-pulse" />
            ))}
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-black/[0.06] rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Period Selector & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <input
          type={isMonthly ? "month" : "week"}
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value)
            resetEdits()
          }}
          className="px-4 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 font-medium"
        />
        <div className="flex items-center gap-2">
          {hasEdits && (
            <button
              onClick={resetEdits}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Düzenlemeleri Sıfırla
            </button>
          )}
          <button
            onClick={() => exportMutation.mutate("pdf")}
            disabled={exportMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            PDF
          </button>
          <button
            onClick={() => exportMutation.mutate("html")}
            disabled={exportMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface font-bold text-xs rounded-lg hover:bg-surface-container-highest transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            HTML
          </button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gelirler */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/15">
            <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">trending_up</span>
              Gelirler
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tarih</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Tutar</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {report?.revenues.map((item) => {
                  const editKey = `rev-${item.date}`
                  return (
                    <tr key={item.date} className="hover:bg-surface-bright transition-colors">
                      <td className="px-6 py-3 text-sm text-on-surface">{item.date}</td>
                      <td className="px-6 py-3 text-right">
                        <EditableCell
                          value={edits[editKey] ?? item.amount}
                          originalValue={item.amount}
                          onChange={(val) => setEdits((prev) => ({ ...prev, [editKey]: val }))}
                        />
                      </td>
                      <td className="px-6 py-3 text-sm text-on-surface-variant">{item.notes || "—"}</td>
                    </tr>
                  )
                })}
                {(!report?.revenues || report.revenues.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                      Bu dönem için gelir kaydı bulunmuyor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Giderler */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/15">
            <h3 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-error">trending_down</span>
              Giderler
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Kategori</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {report?.expenses.map((group) => {
                  const editKey = `exp-${group.category}`
                  return (
                    <tr key={group.category} className="hover:bg-surface-bright transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-on-surface">{group.category}</td>
                      <td className="px-6 py-3 text-right">
                        <EditableCell
                          value={expenseEdits[editKey] ?? group.amount}
                          originalValue={group.amount}
                          onChange={(val) =>
                            setExpenseEdits((prev) => ({ ...prev, [editKey]: val }))
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
                {(!report?.expenses || report.expenses.length === 0) && (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                      Bu dönem için gider kaydı bulunmuyor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-6">
        <h3 className="font-headline text-base font-bold text-on-surface mb-4">Özet</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Toplam Ciro
            </p>
            <p className="font-headline text-xl font-bold text-on-surface tabular-nums">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Toplam Gider
            </p>
            <p className="font-headline text-xl font-bold text-on-surface tabular-nums">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-2">
              KDV
              <EditableTaxRate
                value={taxRate}
                originalValue={report?.taxRate ?? 20}
                onChange={(val) => setTaxRateOverride(val)}
              />
            </p>
            <p className="font-headline text-xl font-bold text-on-surface tabular-nums">
              {formatCurrency(taxAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Net Kar
            </p>
            <p
              className={cn(
                "font-headline text-xl font-bold tabular-nums",
                netProfit >= 0 ? "text-on-surface" : "text-error"
              )}
            >
              {formatCurrency(netProfit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Editable Tax Rate ────────────────────────────────────────────────────────

function EditableTaxRate({
  value,
  originalValue,
  onChange,
}: {
  value: number
  originalValue: number
  onChange: (val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState("")
  const isEdited = value !== originalValue

  if (editing) {
    return (
      <input
        autoFocus
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(tempValue.replace(",", "."))
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) onChange(parsed)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const parsed = parseFloat(tempValue.replace(",", "."))
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) onChange(parsed)
            setEditing(false)
          }
          if (e.key === "Escape") setEditing(false)
        }}
        className="w-14 px-1.5 py-0.5 bg-surface-container-low rounded text-xs text-right outline-none focus:ring-1 focus:ring-primary/30"
      />
    )
  }

  return (
    <button
      onClick={() => {
        setTempValue(String(value).replace(".", ","))
        setEditing(true)
      }}
      className={cn(
        "text-xs font-bold px-1.5 py-0.5 rounded transition-colors",
        isEdited
          ? "bg-amber-100 text-amber-900"
          : "hover:bg-surface-container-low text-on-surface-variant"
      )}
    >
      %{value}
      {isEdited && (
        <span className="material-symbols-outlined text-[12px] ml-0.5 text-amber-600">edit</span>
      )}
    </button>
  )
}

// ─── Comparison Tab ───────────────────────────────────────────────────────────

function ComparisonTab() {
  const currentMonth = format(new Date(), "yyyy-MM")
  const prevMonth = format(subMonths(new Date(), 1), "yyyy-MM")

  const [periods, setPeriods] = useState<string[]>([prevMonth, currentMonth])
  const [periodType, setPeriodType] = useState<"monthly" | "weekly">("monthly")

  const periodsParam = periods.join(",")
  const { data: compareData, isLoading } = useQuery<CompareData>({
    queryKey: ["report-compare", periodsParam, periodType],
    queryFn: () =>
      api.get(`/reports/compare?periods=${periodsParam}&type=${periodType}`).then((r) => r.data),
    enabled: periods.length >= 2,
  })

  const addPeriod = () => {
    if (periodType === "monthly") {
      const last = periods[periods.length - 1]
      if (last) {
        const next = format(subMonths(new Date(last + "-01"), -1), "yyyy-MM")
        setPeriods([...periods, next])
      }
    } else {
      setPeriods([...periods, ""])
    }
  }

  const removePeriod = (index: number) => {
    if (periods.length <= 2) return
    setPeriods(periods.filter((_, i) => i !== index))
  }

  const updatePeriod = (index: number, value: string) => {
    const updated = [...periods]
    updated[index] = value
    setPeriods(updated)
  }

  // Chart data
  const barChartData = useMemo(() => {
    if (!compareData?.data) return []
    return compareData.data.map((d) => ({
      period: d.period,
      Ciro: d.revenue,
      Gider: d.expenses,
      Vergi: d.tax,
      "Net Kar": d.netProfit,
    }))
  }, [compareData])

  const lineChartData = useMemo(() => {
    if (!compareData?.data) return []
    return compareData.data.map((d) => ({
      period: d.period,
      "Kar Marjı %": d.profitMargin,
    }))
  }, [compareData])

  // All category keys
  const allCategories = useMemo(() => {
    if (!compareData?.data) return []
    const cats = new Set<string>()
    compareData.data.forEach((d) => {
      Object.keys(d.categories || {}).forEach((c) => cats.add(c))
    })
    return Array.from(cats)
  }, [compareData])

  const barChartConfig = {
    Ciro: { label: "Ciro", color: "var(--color-primary, #4f46e5)" },
    Gider: { label: "Gider", color: "var(--color-error, #dc2626)" },
    Vergi: { label: "Vergi", color: "var(--color-tertiary, #a855f7)" },
    "Net Kar": { label: "Net Kar", color: "var(--color-secondary, #16a34a)" },
  }

  const lineChartConfig = {
    "Kar Marjı %": { label: "Kar Marjı %", color: "var(--color-primary, #4f46e5)" },
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Period Selectors */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Type Toggle */}
          <div className="flex bg-surface-container rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => setPeriodType("monthly")}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                periodType === "monthly"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Aylık
            </button>
            <button
              onClick={() => setPeriodType("weekly")}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                periodType === "weekly"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Haftalık
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {periods.map((p, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <input
                type={periodType === "monthly" ? "month" : "week"}
                value={p}
                onChange={(e) => updatePeriod(idx, e.target.value)}
                className="px-3 py-2 bg-surface-container-low rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
              {periods.length > 2 && (
                <button
                  onClick={() => removePeriod(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addPeriod}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 h-80 animate-pulse" />
          <div className="bg-surface-container-lowest rounded-2xl p-6 h-60 animate-pulse" />
        </div>
      )}

      {!isLoading && compareData && (
        <>
          {/* Bar Chart */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-6">
            <h3 className="font-headline text-base font-bold text-on-surface mb-4">
              Dönem Karşılaştırması
            </h3>
            <ChartContainer config={barChartConfig} className="h-[320px] w-full">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant, #ccc)" strokeOpacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Ciro" fill="var(--color-Ciro)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gider" fill="var(--color-Gider)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vergi" fill="var(--color-Vergi)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net Kar" fill="var(--color-Net Kar)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-6">
            <h3 className="font-headline text-base font-bold text-on-surface mb-4">
              Kar Marjı Trendi
            </h3>
            <ChartContainer config={lineChartConfig} className="h-[240px] w-full">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant, #ccc)" strokeOpacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Kar Marjı %"
                  stroke="var(--color-Kar Marjı %, var(--color-primary, #4f46e5))"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: "var(--color-Kar Marjı %, var(--color-primary, #4f46e5))" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Comparison Table */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/15">
              <h3 className="font-headline text-base font-bold text-on-surface">
                Detaylı Karşılaştırma
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant sticky left-0 bg-surface-container-lowest z-10 min-w-[160px]">
                      Kalem
                    </th>
                    {compareData.data.map((d) => (
                      <th
                        key={d.period}
                        className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right min-w-[140px]"
                      >
                        {d.period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {/* Revenue */}
                  <tr className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-3 text-sm font-semibold text-on-surface sticky left-0 bg-surface-container-lowest z-10">
                      Ciro
                    </td>
                    {compareData.data.map((d) => (
                      <td key={d.period} className="px-6 py-3 text-sm text-right font-medium text-on-surface tabular-nums">
                        {formatCurrency(d.revenue)}
                      </td>
                    ))}
                  </tr>
                  {/* Expenses */}
                  <tr className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-3 text-sm font-semibold text-on-surface sticky left-0 bg-surface-container-lowest z-10">
                      Gider
                    </td>
                    {compareData.data.map((d) => (
                      <td key={d.period} className="px-6 py-3 text-sm text-right font-medium text-on-surface tabular-nums">
                        {formatCurrency(d.expenses)}
                      </td>
                    ))}
                  </tr>
                  {/* Tax */}
                  <tr className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-3 text-sm font-semibold text-on-surface sticky left-0 bg-surface-container-lowest z-10">
                      Vergi
                    </td>
                    {compareData.data.map((d) => (
                      <td key={d.period} className="px-6 py-3 text-sm text-right font-medium text-on-surface tabular-nums">
                        {formatCurrency(d.tax)}
                      </td>
                    ))}
                  </tr>
                  {/* Categories */}
                  {allCategories.map((cat) => (
                    <tr key={cat} className="hover:bg-surface-bright transition-colors">
                      <td className="px-6 py-3 text-sm text-on-surface-variant sticky left-0 bg-surface-container-lowest z-10">
                        {cat}
                      </td>
                      {compareData.data.map((d) => (
                        <td key={d.period} className="px-6 py-3 text-sm text-right text-on-surface-variant tabular-nums">
                          {formatCurrency(d.categories?.[cat] ?? 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Net Profit - highlighted */}
                  <tr className="bg-surface-container-low font-bold">
                    <td className="px-6 py-3 text-sm text-on-surface sticky left-0 bg-surface-container-low z-10">
                      Net Kar
                    </td>
                    {compareData.data.map((d) => (
                      <td
                        key={d.period}
                        className={cn(
                          "px-6 py-3 text-sm text-right tabular-nums",
                          d.netProfit >= 0 ? "text-on-surface" : "text-error"
                        )}
                      >
                        {formatCurrency(d.netProfit)}
                      </td>
                    ))}
                  </tr>
                  {/* Profit Margin */}
                  <tr className="bg-surface-container-low">
                    <td className="px-6 py-3 text-sm font-semibold text-on-surface sticky left-0 bg-surface-container-low z-10">
                      Kar Marjı
                    </td>
                    {compareData.data.map((d) => (
                      <td
                        key={d.period}
                        className={cn(
                          "px-6 py-3 text-sm text-right font-bold tabular-nums",
                          d.profitMargin >= 0 ? "text-on-surface" : "text-error"
                        )}
                      >
                        %{d.profitMargin.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!isLoading && !compareData && periods.length >= 2 && (
        <div className="bg-surface-container-lowest rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-3 block">
            compare_arrows
          </span>
          <p className="text-sm text-on-surface-variant">
            Karşılaştırma verisi bulunamadı. Dönemleri kontrol edin.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Raporlar</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Aylık ve haftalık finansal raporları inceleyin, karşılaştırma yapın
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="monthly">
        <TabsList variant="line" className="gap-2">
          <TabsTrigger value="monthly" className="px-4 py-2 text-sm font-semibold">
            <span className="material-symbols-outlined text-[18px] mr-1.5">calendar_month</span>
            Aylık Rapor
          </TabsTrigger>
          <TabsTrigger value="weekly" className="px-4 py-2 text-sm font-semibold">
            <span className="material-symbols-outlined text-[18px] mr-1.5">date_range</span>
            Haftalık Rapor
          </TabsTrigger>
          <TabsTrigger value="compare" className="px-4 py-2 text-sm font-semibold">
            <span className="material-symbols-outlined text-[18px] mr-1.5">compare_arrows</span>
            Karşılaştırma
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <PeriodReportTab periodType="monthly" />
        </TabsContent>

        <TabsContent value="weekly">
          <PeriodReportTab periodType="weekly" />
        </TabsContent>

        <TabsContent value="compare">
          <ComparisonTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
