"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyDistribution {
  month: string
  amount: number
  percentage?: number
}

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  paymentDate: string
  distributionType?: string
  distributionMonths?: number
  monthlyDistributions?: MonthlyDistribution[]
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const distributeSchema = z.object({
  distributionType: z.enum(["EQUAL", "REVENUE_BASED"]),
  distributionMonths: z.number().min(2).max(24),
})

type DistributeForm = z.infer<typeof distributeSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistributePage() {
  const queryClient = useQueryClient()
  const [distributeDialog, setDistributeDialog] = useState<{
    open: boolean
    expense: Expense | null
  }>({ open: false, expense: null })
  const [undistributeDialog, setUndistributeDialog] = useState<{
    open: boolean
    expense: Expense | null
  }>({ open: false, expense: null })

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: allExpenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses-all-for-distribution"],
    queryFn: () => api.get("/expenses").then((r) => r.data),
  })

  const undistributed = useMemo(
    () => allExpenses.filter((e) => !e.distributionType || e.distributionType === "NONE"),
    [allExpenses],
  )

  const distributed = useMemo(
    () => allExpenses.filter((e) => e.distributionType && e.distributionType !== "NONE"),
    [allExpenses],
  )

  // ─── Mutations ────────────────────────────────────────────────────────

  const distributeMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { distributionType: string; distributionMonths: number }
    }) => api.post(`/expenses/${id}/distribute`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-all-for-distribution"] })
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Gider basariyla dagitildi.")
      setDistributeDialog({ open: false, expense: null })
    },
    onError: () => toast.error("Gider dagitilirken bir hata olustu."),
  })

  const undistributeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/expenses/${id}/undistribute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-all-for-distribution"] })
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Dagitim iptal edildi.")
      setUndistributeDialog({ open: false, expense: null })
    },
    onError: () => toast.error("Dagitim iptal edilirken bir hata olustu."),
  })

  // ─── Distribute Dialog Form ───────────────────────────────────────────

  function DistributeFormContent({ expense }: { expense: Expense }) {
    const {
      register,
      handleSubmit,
      watch,
      setValue,
      formState: { errors },
    } = useForm<DistributeForm>({
      resolver: zodResolver(distributeSchema),
      defaultValues: {
        distributionType: "EQUAL",
        distributionMonths: 6,
      },
    })

    const distributionType = watch("distributionType")
    const distributionMonths = watch("distributionMonths")

    const preview = useMemo(() => {
      if (distributionType === "EQUAL") {
        const monthlyAmount = expense.amount / distributionMonths
        return Array.from({ length: distributionMonths }, (_, i) => ({
          month: `Ay ${i + 1}`,
          amount: monthlyAmount,
          percentage: 100 / distributionMonths,
        }))
      }
      // Revenue-based is just a preview estimate; actual calculation on server
      return Array.from({ length: distributionMonths }, (_, i) => ({
        month: `Ay ${i + 1}`,
        amount: expense.amount / distributionMonths,
        percentage: 100 / distributionMonths,
      }))
    }, [distributionType, distributionMonths, expense.amount])

    const onSubmit = (data: DistributeForm) => {
      distributeMutation.mutate({
        id: expense.id,
        data: {
          distributionType: data.distributionType,
          distributionMonths: data.distributionMonths,
        },
      })
    }

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Expense info */}
        <div className="bg-surface-container-low rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-on-surface-variant">{expense.title}</span>
            <span className="text-lg font-bold text-on-surface">{formatCurrency(expense.amount)}</span>
          </div>
        </div>

        {/* Distribution Type */}
        <div>
          <label className="text-sm font-semibold text-on-surface mb-2 block">
            Dagitim Tipi
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "EQUAL", label: "Esit Dagitim", desc: "Her aya esit tutar" },
              { value: "REVENUE_BASED", label: "Ciro Bazli", desc: "Ciroya oranli dagitim" },
            ].map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input
                  type="radio"
                  {...register("distributionType")}
                  value={opt.value}
                  className="sr-only peer"
                />
                <div className="p-4 rounded-xl border border-outline-variant/20 transition-all peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-surface-container-low">
                  <p className="text-sm font-bold text-on-surface">{opt.label}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Month Count */}
        <div>
          <label className="text-sm font-semibold text-on-surface mb-2 block">
            Ay Sayisi: <span className="text-primary">{distributionMonths}</span>
          </label>
          <input
            type="range"
            min={2}
            max={24}
            {...register("distributionMonths", { valueAsNumber: true })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
            <span>2 ay</span>
            <span>24 ay</span>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h4 className="text-sm font-semibold text-on-surface mb-2">Dagitim Onizleme</h4>
          <div className="bg-surface-container-low rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Ay
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Tutar
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Yuzde
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-on-surface">{row.month}</td>
                    <td className="px-3 py-2 text-right font-semibold text-on-surface">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface-variant">
                      %{row.percentage.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
            Iptal
          </DialogClose>
          <button
            type="submit"
            disabled={distributeMutation.isPending}
            className="bg-primary text-on-primary font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {distributeMutation.isPending ? "Dagitiliyor..." : "Dagit"}
          </button>
        </DialogFooter>
      </form>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
          Gider Dagitimi
        </h1>
        <p className="text-on-surface-variant mt-2 text-lg">
          Buyuk giderleri birden fazla aya dagitarak maliyetleri yayabilirsiniz.
        </p>
      </div>

      {/* Undistributed Expenses */}
      <div>
        <h2 className="font-headline text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-primary">pending</span>
          Dagitilmamis Giderler
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-xl p-6 border border-white"
              >
                <div className="h-4 w-32 bg-black/[0.06] rounded animate-pulse mb-3" />
                <div className="h-7 w-24 bg-black/[0.06] rounded animate-pulse mb-4" />
                <div className="h-9 w-full bg-black/[0.06] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : undistributed.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-white">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">
              check_circle
            </span>
            <p className="text-on-surface-variant">Tum giderler dagitilmis durumda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {undistributed.map((expense) => (
              <div
                key={expense.id}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white flex flex-col"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-semibold text-on-surface">{expense.title}</span>
                  <span className="inline-flex h-5 items-center px-2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {expense.category}
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-on-surface font-headline mb-1">
                  {formatCurrency(expense.amount)}
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  {format(new Date(expense.paymentDate), "d MMMM yyyy", { locale: tr })}
                </p>
                <button
                  onClick={() => setDistributeDialog({ open: true, expense })}
                  className="mt-auto bg-primary text-on-primary font-bold rounded-md px-4 py-2.5 text-sm w-full flex items-center justify-center gap-2 hover:translate-y-[-1px] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">call_split</span>
                  Dagit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distributed Expenses */}
      <div>
        <h2 className="font-headline text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-secondary">check_circle</span>
          Dagitilmis Giderler
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-xl p-6 border border-white"
              >
                <div className="h-5 w-48 bg-black/[0.06] rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-black/[0.06] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : distributed.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-white">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">
              inbox
            </span>
            <p className="text-on-surface-variant">Henuz dagitilmis gider bulunmuyor.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_rgba(25,28,30,0.03)] border border-white overflow-hidden">
            <Accordion>
              {distributed.map((expense) => (
                <AccordionItem key={expense.id} value={expense.id}>
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-on-surface truncate">
                            {expense.title}
                          </span>
                          <span className="inline-flex h-5 items-center px-2 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold shrink-0">
                            {expense.distributionType === "EQUAL"
                              ? "Esit"
                              : "Ciro Bazli"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          <span>Toplam: {formatCurrency(expense.amount)}</span>
                          <span>|</span>
                          <span>{expense.distributionMonths ?? 0} ay</span>
                          <span>|</span>
                          <span>
                            {format(new Date(expense.paymentDate), "d MMM yyyy", { locale: tr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6">
                    {/* Monthly breakdown table */}
                    {expense.monthlyDistributions && expense.monthlyDistributions.length > 0 ? (
                      <div className="bg-surface-container-low rounded-lg overflow-hidden mb-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-surface-container">
                              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                                Ay
                              </th>
                              <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                                Tutar
                              </th>
                              <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                                Yuzde
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {expense.monthlyDistributions.map((dist, i) => (
                              <tr key={i} className="hover:bg-surface-bright transition-colors">
                                <td className="px-4 py-2.5 text-on-surface font-medium">
                                  {dist.month}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-on-surface">
                                  {formatCurrency(dist.amount)}
                                </td>
                                <td className="px-4 py-2.5 text-right text-on-surface-variant">
                                  %
                                  {dist.percentage
                                    ? dist.percentage.toFixed(1)
                                    : ((dist.amount / expense.amount) * 100).toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-surface-container-low rounded-lg p-6 text-center mb-4">
                        <p className="text-sm text-on-surface-variant">
                          Dagitim detayi sunucudan yuklenemedi.
                        </p>
                      </div>
                    )}

                    {/* Undo button */}
                    <button
                      onClick={() => setUndistributeDialog({ open: true, expense })}
                      className="mb-4 bg-error/10 text-error font-bold rounded-md px-4 py-2 text-sm flex items-center gap-2 hover:bg-error/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">undo</span>
                      Dagitimi Iptal Et
                    </button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      {/* Distribute Dialog */}
      <Dialog
        open={distributeDialog.open}
        onOpenChange={(open) => {
          if (!open) setDistributeDialog({ open: false, expense: null })
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gider Dagit</DialogTitle>
            <DialogDescription>
              Gideri sectiginiz yonteme gore birden fazla aya dagitabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          {distributeDialog.expense && (
            <DistributeFormContent expense={distributeDialog.expense} />
          )}
        </DialogContent>
      </Dialog>

      {/* Undistribute Confirm Dialog */}
      <Dialog
        open={undistributeDialog.open}
        onOpenChange={(open) => {
          if (!open) setUndistributeDialog({ open: false, expense: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dagitimi Iptal Et</DialogTitle>
            <DialogDescription>
              &quot;{undistributeDialog.expense?.title}&quot; giderinin dagitimini iptal etmek
              istediginize emin misiniz? Gider tek bir aya geri donecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Vazgec
            </DialogClose>
            <button
              onClick={() => {
                if (undistributeDialog.expense) {
                  undistributeMutation.mutate(undistributeDialog.expense.id)
                }
              }}
              disabled={undistributeMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {undistributeMutation.isPending ? "Iptal ediliyor..." : "Iptal Et"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
