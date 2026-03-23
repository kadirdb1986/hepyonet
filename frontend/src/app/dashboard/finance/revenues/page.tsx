"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrency, cn } from "@/lib/utils"
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

interface Revenue {
  id: string
  date: string
  amount: number
  notes?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TR_DAY_NAMES_SHORT = ["Paz", "Pzt", "Sal", "Car", "Per", "Cum", "Cmt"]
const TR_DAY_NAMES_FULL = [
  "Pazar",
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
]

function isWeekend(dayIndex: number) {
  return dayIndex === 0 || dayIndex === 6 // Sunday or Saturday
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RevenuesPage() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    date: string
    amount: number
    existingId?: string
  }>({ open: false, date: "", amount: 0 })

  const month = format(currentDate, "yyyy-MM")
  const monthDisplay = format(currentDate, "MMMM yyyy", { locale: tr })

  const goToPreviousMonth = () => setCurrentDate((d) => subMonths(d, 1))
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1))

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: revenues = [], isLoading } = useQuery<Revenue[]>({
    queryKey: ["revenues", month],
    queryFn: () => api.get(`/revenues?month=${month}`).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { date: string; amount: number }) =>
      api.post("/revenues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues", month] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Ciro basariyla kaydedildi.")
      setConfirmDialog({ open: false, date: "", amount: 0 })
      setEditingDate(null)
    },
    onError: () => toast.error("Ciro kaydedilirken bir hata olustu."),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; amount: number }) =>
      api.patch(`/revenues/${data.id}`, { amount: data.amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues", month] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Ciro basariyla guncellendi.")
      setConfirmDialog({ open: false, date: "", amount: 0 })
      setEditingDate(null)
    },
    onError: () => toast.error("Ciro guncellenirken bir hata olustu."),
  })

  // ─── Build calendar days ──────────────────────────────────────────────

  const allDays = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const revenueMap = useMemo(() => {
    const map: Record<string, Revenue> = {}
    revenues.forEach((r) => {
      const dateKey = format(new Date(r.date), "yyyy-MM-dd")
      map[dateKey] = r
    })
    return map
  }, [revenues])

  const monthTotal = useMemo(
    () => revenues.reduce((sum, r) => sum + r.amount, 0),
    [revenues],
  )

  const daysWithRevenue = revenues.filter((r) => r.amount > 0).length
  const dailyAverage = daysWithRevenue > 0 ? monthTotal / daysWithRevenue : 0

  // ─── Inline edit handlers ─────────────────────────────────────────────

  const handleStartEdit = useCallback((dateStr: string, currentAmount: number) => {
    setEditingDate(dateStr)
    setEditingValue(currentAmount > 0 ? String(currentAmount) : "")
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingDate(null)
    setEditingValue("")
  }, [])

  const handleConfirmEdit = useCallback(
    (dateStr: string) => {
      const amount = parseFloat(editingValue.replace(",", ".")) || 0
      if (amount < 0) return

      const existing = revenueMap[dateStr]
      setConfirmDialog({
        open: true,
        date: dateStr,
        amount,
        existingId: existing?.id,
      })
    },
    [editingValue, revenueMap],
  )

  const handleSave = () => {
    const { date, amount, existingId } = confirmDialog
    if (existingId) {
      updateMutation.mutate({ id: existingId, amount })
    } else {
      createMutation.mutate({ date, amount })
    }
  }

  // ─── Bar chart ────────────────────────────────────────────────────────

  const maxRevenue = useMemo(
    () => Math.max(...allDays.map((d) => revenueMap[format(d, "yyyy-MM-dd")]?.amount ?? 0), 1),
    [allDays, revenueMap],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
          Ciro Girisi
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <span className="material-symbols-outlined text-xl">payments</span>
            <span className="text-xs font-bold uppercase tracking-wider">Aylik Toplam Ciro</span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface font-headline">
            {formatCurrency(monthTotal)}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white">
          <div className="flex items-center gap-2 text-primary mb-2">
            <span className="material-symbols-outlined text-xl">avg_pace</span>
            <span className="text-xs font-bold uppercase tracking-wider">Gunluk Ortalama</span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface font-headline">
            {formatCurrency(dailyAverage)}
          </p>
        </div>
      </div>

      {/* Editable Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] overflow-hidden border border-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Gun Adi
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Tarih
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                  Tutar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-black/[0.06] rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-black/[0.06] rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-black/[0.06] rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                : allDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd")
                    const dayIndex = getDay(day)
                    const dayName = TR_DAY_NAMES_SHORT[dayIndex]
                    const dayNameFull = TR_DAY_NAMES_FULL[dayIndex]
                    const weekend = isWeekend(dayIndex)
                    const revenue = revenueMap[dateStr]
                    const amount = revenue?.amount ?? 0
                    const isEditing = editingDate === dateStr

                    return (
                      <tr
                        key={dateStr}
                        className="hover:bg-surface-bright transition-colors"
                      >
                        <td
                          className={cn(
                            "px-6 py-3 text-sm font-medium",
                            weekend ? "text-on-surface-variant/50" : "text-on-surface",
                          )}
                        >
                          {dayNameFull} ({dayName})
                        </td>
                        <td className="px-6 py-3 text-sm text-on-surface">
                          {format(day, "d MMMM yyyy", { locale: tr })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                                  setEditingValue(cleaned)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleConfirmEdit(dateStr)
                                  if (e.key === "Escape") handleCancelEdit()
                                }}
                                autoFocus
                                className="w-32 px-3 py-1.5 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none text-right text-sm font-semibold"
                                placeholder="0"
                              />
                              <button
                                onClick={() => handleConfirmEdit(dateStr)}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-secondary text-on-secondary hover:bg-secondary/80 transition-colors"
                              >
                                <span className="material-symbols-outlined text-base">check</span>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(dateStr, amount)}
                              className={cn(
                                "text-sm font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-surface-container-high",
                                amount > 0 ? "text-on-surface" : "text-on-surface-variant/40",
                              )}
                            >
                              {amount > 0 ? formatCurrency(amount) : "—"}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              {/* Footer total */}
              {!isLoading && (
                <tr className="bg-surface-container-low">
                  <td className="px-6 py-4 text-sm font-bold text-on-surface" colSpan={2}>
                    Toplam
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-extrabold text-on-surface">
                    {formatCurrency(monthTotal)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-6">
          Aylik Ciro Grafigi
        </h2>
        <div className="flex items-end gap-1 h-48">
          {allDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd")
            const amount = revenueMap[dateStr]?.amount ?? 0
            const barHeight = Math.max((amount / maxRevenue) * 192, 2)
            const dayIndex = getDay(day)

            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-on-surface whitespace-nowrap">
                  {amount > 0 ? formatCurrency(amount) : ""}
                </div>
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-colors",
                    amount > 0
                      ? "bg-primary/70 group-hover:bg-primary"
                      : "bg-surface-container-high",
                  )}
                  style={{ height: `${barHeight}px` }}
                />
                <span
                  className={cn(
                    "text-[9px] font-bold",
                    isWeekend(dayIndex) ? "text-on-surface-variant/40" : "text-on-surface-variant",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, date: "", amount: 0 })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ciroyu Kaydet</DialogTitle>
            <DialogDescription>
              {confirmDialog.date &&
                format(new Date(confirmDialog.date), "d MMMM yyyy, EEEE", { locale: tr })}{" "}
              tarihine <strong>{formatCurrency(confirmDialog.amount)}</strong> ciro{" "}
              {confirmDialog.existingId ? "guncellenecek" : "kaydedilecek"}. Onayliyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary text-on-primary font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
