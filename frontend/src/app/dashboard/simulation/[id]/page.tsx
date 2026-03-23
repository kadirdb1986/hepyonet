"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getDaysInMonth, parse } from "date-fns"
import api from "@/lib/api"
import { formatCurrency, formatCurrencyDecimal, cn } from "@/lib/utils"
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

interface SimRevenue {
  id: string
  name: string
  amount: number
  unitPrice?: number
  quantity?: number
}

interface SimExpense {
  id: string
  name: string
  amount: number
  type?: string
}

interface SimulationDetail {
  id: string
  name: string
  month?: string
  revenues: SimRevenue[]
  expenses: SimExpense[]
  totalRevenue?: number
  totalExpense?: number
  netProfit?: number
}

interface Product {
  id: string
  name: string
  price?: number
  calculatedCost?: number
  isMenuItem: boolean
}

// ─── Editable Cell ────────────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  format: formatFn,
  className: extraClass,
}: {
  value: number
  onChange: (val: number) => void
  format?: (val: number) => string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
          setDraft(cleaned)
        }}
        onBlur={() => {
          onChange(parseFloat(draft) || 0)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(parseFloat(draft) || 0)
            setEditing(false)
          }
          if (e.key === "Escape") {
            setDraft(String(value))
            setEditing(false)
          }
        }}
        className="w-24 px-2 py-1 bg-surface-container-low border-0 rounded text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
      />
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value))
        setEditing(true)
      }}
      className={cn(
        "text-sm font-semibold text-on-surface hover:text-primary cursor-pointer transition-colors",
        extraClass,
      )}
    >
      {formatFn ? formatFn(value) : value}
    </button>
  )
}

// ─── Editable Title ───────────────────────────────────────────────────────────

function EditableTitle({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) onChange(draft.trim())
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (draft.trim()) onChange(draft.trim())
            setEditing(false)
          }
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
        className="text-2xl font-extrabold tracking-tight text-on-surface bg-surface-container-low px-3 py-1 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-headline"
      />
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className="text-2xl font-extrabold tracking-tight text-on-surface hover:text-primary transition-colors cursor-pointer font-headline"
    >
      {value}
    </button>
  )
}

// ─── Revenue Row (local state) ────────────────────────────────────────────────

interface LocalRevenue {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

interface LocalExpense {
  id: string
  name: string
  amount: number
  type?: string
}

interface LocalFoodCost {
  id: string
  name: string
  unitCost: number
  quantity: number
}

// ─── Day names ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"]
const DEFAULT_WEIGHTS = [10, 12, 13, 14, 17, 18, 16]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimulationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  // ─── Local state ──────────────────────────────────────────────────────

  const [title, setTitle] = useState("")
  const [revenues, setRevenues] = useState<LocalRevenue[]>([])
  const [foodCosts, setFoodCosts] = useState<LocalFoodCost[]>([])
  const [expenses, setExpenses] = useState<LocalExpense[]>([])
  const [kdvRate, setKdvRate] = useState(10)
  const [incomeTaxRate, setIncomeTaxRate] = useState(20)
  const [dayWeights, setDayWeights] = useState<number[]>([...DEFAULT_WEIGHTS])
  const [initialized, setInitialized] = useState(false)

  // Add forms
  const [newRevName, setNewRevName] = useState("")
  const [newRevAmount, setNewRevAmount] = useState("")
  const [newExpName, setNewExpName] = useState("")
  const [newExpAmount, setNewExpAmount] = useState("")

  // Duplicate dialog
  const [dupOpen, setDupOpen] = useState(false)
  const [dupName, setDupName] = useState("")

  // ─── Queries ──────────────────────────────────────────────────────────

  const { data: simulation, isLoading } = useQuery<SimulationDetail>({
    queryKey: ["simulation", id],
    queryFn: () => api.get(`/simulations/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then((r) => r.data),
  })

  // Build product cost map
  const productCostMap = useMemo(() => {
    const map: Record<string, number> = {}
    products.forEach((p) => {
      map[p.name] = p.calculatedCost ?? 0
    })
    return map
  }, [products])

  // ─── Initialize local state from API data ─────────────────────────────

  useEffect(() => {
    if (simulation && !initialized) {
      setTitle(simulation.name)
      setRevenues(
        (simulation.revenues || []).map((r) => ({
          id: r.id,
          name: r.name,
          quantity: r.quantity ?? r.amount ?? 0,
          unitPrice: r.unitPrice ?? 0,
        })),
      )
      setFoodCosts(
        (simulation.revenues || []).map((r) => ({
          id: r.id,
          name: r.name,
          unitCost: productCostMap[r.name] ?? 0,
          quantity: r.quantity ?? r.amount ?? 0,
        })),
      )
      setExpenses(
        (simulation.expenses || [])
          .filter((e) => e.type !== "food_cost")
          .map((e) => ({
            id: e.id,
            name: e.name,
            amount: e.amount,
            type: e.type,
          })),
      )
      setInitialized(true)
    }
  }, [simulation, initialized, productCostMap])

  // ─── Calculations ─────────────────────────────────────────────────────

  const totalRevenue = useMemo(
    () => revenues.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0),
    [revenues],
  )

  const totalFoodCost = useMemo(
    () => foodCosts.reduce((sum, fc) => sum + fc.unitCost * fc.quantity, 0),
    [foodCosts],
  )

  const totalFixedExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  )

  const totalExpense = totalFoodCost + totalFixedExpenses

  const grossProfit = totalRevenue - totalExpense
  const kdvNet = (grossProfit * kdvRate) / (100 + kdvRate)
  const profitBeforeTax = grossProfit - kdvNet
  const incomeTax = Math.max(0, (profitBeforeTax * incomeTaxRate) / 100)
  const netProfit = profitBeforeTax - incomeTax

  // ─── Weekly Revenue Distribution ──────────────────────────────────────

  const daysInMonth = useMemo(() => {
    if (!simulation?.month) return 30
    try {
      const date = parse(simulation.month, "yyyy-MM", new Date())
      return getDaysInMonth(date)
    } catch {
      return 30
    }
  }, [simulation?.month])

  const weeklyRevenue = totalRevenue / daysInMonth * 7
  const totalWeight = dayWeights.reduce((a, b) => a + b, 0) || 1

  // ─── Revenue helpers ──────────────────────────────────────────────────

  const updateRevenue = useCallback((idx: number, field: keyof LocalRevenue, value: number | string) => {
    setRevenues((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
    // Sync food cost quantity if quantity changed
    if (field === "quantity") {
      setFoodCosts((prev) => {
        const next = [...prev]
        if (next[idx]) {
          next[idx] = { ...next[idx], quantity: value as number }
        }
        return next
      })
    }
  }, [])

  const removeRevenue = useCallback((idx: number) => {
    setRevenues((prev) => prev.filter((_, i) => i !== idx))
    setFoodCosts((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const addRevenue = useCallback(() => {
    if (!newRevName.trim()) return
    const amount = parseFloat(newRevAmount.replace(",", ".")) || 0
    const newId = `local-${Date.now()}`
    setRevenues((prev) => [...prev, { id: newId, name: newRevName.trim(), quantity: amount, unitPrice: 0 }])
    setFoodCosts((prev) => [
      ...prev,
      { id: newId, name: newRevName.trim(), unitCost: productCostMap[newRevName.trim()] ?? 0, quantity: amount },
    ])
    setNewRevName("")
    setNewRevAmount("")
  }, [newRevName, newRevAmount, productCostMap])

  // ─── Expense helpers ──────────────────────────────────────────────────

  const updateExpense = useCallback((idx: number, field: keyof LocalExpense, value: number | string) => {
    setExpenses((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const removeExpense = useCallback((idx: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const addExpense = useCallback(() => {
    if (!newExpName.trim()) return
    const amount = parseFloat(newExpAmount.replace(",", ".")) || 0
    setExpenses((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, name: newExpName.trim(), amount, type: "fixed" },
    ])
    setNewExpName("")
    setNewExpAmount("")
  }, [newExpName, newExpAmount])

  // ─── Mutations ────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      // First, delete all existing revenues and expenses, then re-add
      // Alternatively, send PATCH with full data
      await api.patch(`/simulations/${id}`, {
        name: title,
        revenues: revenues.map((r) => ({
          name: r.name,
          amount: r.quantity,
          unitPrice: r.unitPrice,
          quantity: r.quantity,
        })),
        expenses: [
          ...foodCosts.map((fc) => ({
            name: fc.name,
            amount: fc.unitCost * fc.quantity,
            type: "food_cost",
          })),
          ...expenses.map((e) => ({
            name: e.name,
            amount: e.amount,
            type: e.type || "fixed",
          })),
        ],
        kdvRate,
        incomeTaxRate,
        dayWeights,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation", id] })
      queryClient.invalidateQueries({ queryKey: ["simulations"] })
      toast.success("Simulasyon kaydedildi.")
      setInitialized(false)
    },
    onError: () => toast.error("Simulasyon kaydedilirken bir hata olustu."),
  })

  const duplicateMutation = useMutation({
    mutationFn: (name: string) => api.post(`/simulations/${id}/duplicate`, { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] })
      toast.success("Simulasyon cogaltildi.")
      setDupOpen(false)
      setDupName("")
      router.push(`/dashboard/simulation/${res.data.id}`)
    },
    onError: () => toast.error("Simulasyon cogaltilirken bir hata olustu."),
  })

  // ─── Loading ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!simulation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">error</span>
        <p className="text-on-surface-variant">Simulasyon bulunamadi.</p>
        <button
          onClick={() => router.push("/dashboard/simulation")}
          className="text-primary font-semibold text-sm hover:underline"
        >
          Geri Don
        </button>
      </div>
    )
  }

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/simulation")}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <EditableTitle value={title} onChange={setTitle} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDupName(title + " (Kopya)")
              setDupOpen(true)
            }}
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">content_copy</span>
            Cogalt
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-md font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">save</span>
            {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Revenues */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
          <div className="p-6 border-b border-outline-variant/15">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">trending_up</span>
              <h2 className="font-headline text-lg font-bold text-on-surface">Gelirler</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Urun
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Miktar
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Birim Fiyat
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Toplam
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {revenues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                      Henuz gelir eklenmemis
                    </td>
                  </tr>
                ) : (
                  revenues.map((rev, idx) => (
                    <tr key={rev.id} className="hover:bg-surface-bright transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-on-surface">{rev.name}</td>
                      <td className="px-4 py-3">
                        <EditableCell
                          value={rev.quantity}
                          onChange={(val) => updateRevenue(idx, "quantity", val)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <EditableCell
                          value={rev.unitPrice}
                          onChange={(val) => updateRevenue(idx, "unitPrice", val)}
                          format={formatCurrencyDecimal}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-on-surface">
                        {formatCurrencyDecimal(rev.quantity * rev.unitPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeRevenue(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Add revenue form */}
          <div className="p-4 border-t border-outline-variant/15">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addRevenue()
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1">
                <input
                  value={newRevName}
                  onChange={(e) => setNewRevName(e.target.value)}
                  placeholder="Urun adi"
                  className="w-full px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="w-24">
                <input
                  value={newRevAmount}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    setNewRevAmount(cleaned)
                  }}
                  placeholder="Miktar"
                  className="w-full px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={!newRevName.trim()}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                Ekle
              </button>
            </form>
          </div>
        </div>

        {/* Right: Expenses */}
        <div className="space-y-6">
          {/* Food Costs */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
            <div className="p-6 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error">restaurant</span>
                <h2 className="font-headline text-lg font-bold text-on-surface">
                  Gida Maliyetleri
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Urun
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Birim Maliyet
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Miktar
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Toplam
                    </th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {foodCosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                        Gelir eklendiginde gida maliyetleri otomatik olusacaktir
                      </td>
                    </tr>
                  ) : (
                    foodCosts.map((fc, idx) => (
                      <tr key={fc.id} className="hover:bg-surface-bright transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-on-surface">{fc.name}</td>
                        <td className="px-4 py-3">
                          <EditableCell
                            value={fc.unitCost}
                            onChange={(val) => {
                              setFoodCosts((prev) => {
                                const next = [...prev]
                                next[idx] = { ...next[idx], unitCost: val }
                                return next
                              })
                            }}
                            format={formatCurrencyDecimal}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface">{fc.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-on-surface">
                          {formatCurrencyDecimal(fc.unitCost * fc.quantity)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeRevenue(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fixed & Other Expenses */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
            <div className="p-6 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error">receipt_long</span>
                <h2 className="font-headline text-lg font-bold text-on-surface">
                  Sabit ve Diger Giderler
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Ad
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Tutar
                    </th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-on-surface-variant">
                        Henuz gider eklenmemis
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-surface-bright transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-on-surface">{exp.name}</td>
                        <td className="px-4 py-3">
                          <EditableCell
                            value={exp.amount}
                            onChange={(val) => updateExpense(idx, "amount", val)}
                            format={formatCurrency}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeExpense(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Add expense form */}
            <div className="p-4 border-t border-outline-variant/15">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addExpense()
                }}
                className="flex items-end gap-2"
              >
                <div className="flex-1">
                  <input
                    value={newExpName}
                    onChange={(e) => setNewExpName(e.target.value)}
                    placeholder="Gider adi"
                    className="w-full px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="w-32">
                  <input
                    value={newExpAmount}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                      setNewExpAmount(cleaned)
                    }}
                    placeholder="Tutar"
                    className="w-full px-3 py-2 bg-surface-container-low border-0 rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newExpName.trim()}
                  className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                >
                  Ekle
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-low rounded-xl p-6">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <span className="material-symbols-outlined text-xl">trending_up</span>
            <span className="text-xs font-bold uppercase tracking-wider">Toplam Ciro</span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface font-headline">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-6">
          <div className="flex items-center gap-2 text-error mb-2">
            <span className="material-symbols-outlined text-xl">trending_down</span>
            <span className="text-xs font-bold uppercase tracking-wider">Toplam Gider</span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface font-headline">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profit & Tax */}
        <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
          <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance</span>
            Kar ve Vergi
          </h3>

          <div className="space-y-4">
            {/* Gross Profit */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-on-surface-variant font-medium">Brut Kar</span>
              <span
                className={cn(
                  "text-sm font-bold",
                  grossProfit >= 0 ? "text-secondary" : "text-error",
                )}
              >
                {formatCurrency(grossProfit)}
              </span>
            </div>

            {/* KDV */}
            <div className="flex items-center justify-between py-2 border-t border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant font-medium">KDV</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-on-surface-variant">%</span>
                  <input
                    type="text"
                    value={kdvRate}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                      setKdvRate(parseFloat(cleaned) || 0)
                    }}
                    className="w-12 px-2 py-1 bg-surface-container-lowest border-0 rounded text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 text-center"
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-on-surface">
                {formatCurrency(kdvNet)}
              </span>
            </div>

            {/* Income Tax */}
            <div className="flex items-center justify-between py-2 border-t border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant font-medium">Gelir Vergisi</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-on-surface-variant">%</span>
                  <input
                    type="text"
                    value={incomeTaxRate}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                      setIncomeTaxRate(parseFloat(cleaned) || 0)
                    }}
                    className="w-12 px-2 py-1 bg-surface-container-lowest border-0 rounded text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 text-center"
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-on-surface">
                {formatCurrency(incomeTax)}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex items-center justify-between py-3 border-t-2 border-on-surface/20 mt-2">
              <span className="text-base font-bold text-on-surface">NET Kar</span>
              <span
                className={cn(
                  "text-xl font-extrabold",
                  netProfit >= 0 ? "text-secondary" : "text-error",
                )}
              >
                {netProfit >= 0 ? "+" : ""}
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Revenue Distribution */}
        <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
          <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            Haftalik Tahmini Ciro Dagilimi
          </h3>

          <p className="text-xs text-on-surface-variant">
            Haftalik tahmini ciro: {formatCurrency(weeklyRevenue)}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Gun
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Agirlik %
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Tahmini Gunluk Ciro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {DAY_NAMES.map((day, idx) => {
                  const dailyCiro = weeklyRevenue * dayWeights[idx] / totalWeight
                  return (
                    <tr key={day} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-3 py-2 text-sm font-medium text-on-surface">{day}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={dayWeights[idx]}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                            const val = parseFloat(cleaned) || 0
                            setDayWeights((prev) => {
                              const next = [...prev]
                              next[idx] = val
                              return next
                            })
                          }}
                          className="w-16 px-2 py-1 bg-surface-container-lowest border-0 rounded text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-on-surface">
                        {formatCurrency(dailyCiro)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Duplicate Dialog */}
      <Dialog
        open={dupOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDupOpen(false)
            setDupName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Simulasyonu Cogalt</DialogTitle>
            <DialogDescription>
              Yeni simulasyon icin bir ad belirleyin.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!dupName.trim()) return
              duplicateMutation.mutate(dupName.trim())
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Simulasyon Adi <span className="text-error">*</span>
              </label>
              <input
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                placeholder="Orn: Mart 2026 Tahmini (Kopya)"
                className={inputClass}
              />
            </div>
            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={duplicateMutation.isPending || !dupName.trim()}
                className="bg-primary text-on-primary font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
              >
                {duplicateMutation.isPending ? "Cogaltiliyor..." : "Cogalt"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
