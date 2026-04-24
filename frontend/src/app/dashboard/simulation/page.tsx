"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrency, cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table/data-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Simulation {
  id: string
  name: string
  month?: string
  totalRevenue?: number
  totalExpense?: number
  netProfit?: number
}

interface FixedExpense {
  id: string
  name: string
  amount: number
}

interface FixedRevenue {
  id: string
  productId: string
  quantity: number
  product?: { id: string; name: string; price?: number }
}

interface Product {
  id: string
  name: string
  price?: number
  isMenuItem: boolean
}

// ─── Inline Editable Cell ─────────────────────────────────────────────────────

function InlineEditableAmount({
  value,
  onSave,
}: {
  value: number
  onSave: (val: number) => void
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
          const num = parseFloat(draft) || 0
          onSave(num)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const num = parseFloat(draft) || 0
            onSave(num)
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
      className="text-sm font-semibold text-on-surface hover:text-primary cursor-pointer transition-colors"
    >
      {formatCurrency(value)}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Create simulation dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newMonth, setNewMonth] = useState("")

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; simulation: Simulation | null }>({
    open: false,
    simulation: null,
  })

  // Fixed expense add form
  const [feName, setFeName] = useState("")
  const [feAmount, setFeAmount] = useState("")

  // Fixed revenue add form
  const [frProductId, setFrProductId] = useState("")
  const [frQuantity, setFrQuantity] = useState("")

  // ─── Queries ──────────────────────────────────────────────────────────

  const { data: simulations = [] } = useQuery<Simulation[]>({
    queryKey: ["simulations"],
    queryFn: () => api.get("/simulations").then((r) => r.data),
  })

  const { data: fixedExpenses = [] } = useQuery<FixedExpense[]>({
    queryKey: ["sim-fixed-expenses"],
    queryFn: () => api.get("/sim-fixed-expenses").then((r) => r.data),
  })

  const { data: fixedRevenues = [] } = useQuery<FixedRevenue[]>({
    queryKey: ["sim-fixed-revenues"],
    queryFn: () => api.get("/sim-fixed-revenues").then((r) => r.data),
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then((r) => r.data),
  })

  const menuProducts = products.filter((p) => p.isMenuItem)

  // ─── Mutations ────────────────────────────────────────────────────────

  const createSimulation = useMutation({
    mutationFn: (data: { name: string; month: string }) => api.post("/simulations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] })
      toast.success("Simulasyon olusturuldu.")
      setCreateOpen(false)
      setNewName("")
      setNewMonth("")
    },
    onError: () => toast.error("Simulasyon olusturulurken bir hata olustu."),
  })

  const deleteSimulation = useMutation({
    mutationFn: (id: string) => api.delete(`/simulations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] })
      toast.success("Simulasyon silindi.")
      setDeleteDialog({ open: false, simulation: null })
    },
    onError: () => toast.error("Simulasyon silinirken bir hata olustu."),
  })

  // Fixed Expenses
  const createFixedExpense = useMutation({
    mutationFn: (data: { name: string; amount?: number }) => api.post("/sim-fixed-expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sim-fixed-expenses"] })
      toast.success("Sabit gider eklendi.")
      setFeName("")
      setFeAmount("")
    },
    onError: () => toast.error("Sabit gider eklenirken bir hata olustu."),
  })

  const updateFixedExpense = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/sim-fixed-expenses/${id}`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sim-fixed-expenses"] })
    },
    onError: () => toast.error("Gider guncellenirken bir hata olustu."),
  })

  const deleteFixedExpense = useMutation({
    mutationFn: (id: string) => api.delete(`/sim-fixed-expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sim-fixed-expenses"] })
      toast.success("Sabit gider silindi.")
    },
    onError: () => toast.error("Sabit gider silinirken bir hata olustu."),
  })

  // Fixed Revenues
  const createFixedRevenue = useMutation({
    mutationFn: (data: { productId: string; quantity: number }) =>
      api.post("/sim-fixed-revenues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sim-fixed-revenues"] })
      toast.success("Sabit gelir eklendi.")
      setFrProductId("")
      setFrQuantity("")
    },
    onError: () => toast.error("Sabit gelir eklenirken bir hata olustu."),
  })

  const deleteFixedRevenue = useMutation({
    mutationFn: (id: string) => api.delete(`/sim-fixed-revenues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sim-fixed-revenues"] })
      toast.success("Sabit gelir silindi.")
    },
    onError: () => toast.error("Sabit gelir silinirken bir hata olustu."),
  })

  // ─── Simulation Table Columns ─────────────────────────────────────────

  const simulationColumns: ColumnDef<Simulation>[] = [
    {
      accessorKey: "name",
      header: "Ad",
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/dashboard/simulation/${row.original.id}`)}
          className="font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: "totalRevenue",
      header: "Toplam Ciro",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-on-surface">
          {formatCurrency(row.original.totalRevenue ?? 0)}
        </span>
      ),
    },
    {
      id: "netProfit",
      header: "Net Kar",
      cell: ({ row }) => {
        const net = row.original.netProfit ?? 0
        return (
          <span className={cn("text-sm font-bold", net >= 0 ? "text-secondary" : "text-error")}>
            {net >= 0 ? "+" : ""}
            {formatCurrency(net)}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Islemler",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setDeleteDialog({ open: true, simulation: row.original })
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      ),
      enableSorting: false,
    },
  ]

  // ─── Helpers ──────────────────────────────────────────────────────────

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Simulasyon
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            Gelir-gider simulasyonlari ile isinizi planlayın.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="simulations">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="simulations">Simulasyonlar</TabsTrigger>
          <TabsTrigger value="fixed-expenses">Sabit Giderler</TabsTrigger>
          <TabsTrigger value="fixed-revenues">Sabit Gelirler</TabsTrigger>
        </TabsList>

        {/* Tab 1: Simulations */}
        <TabsContent value="simulations">
          <DataTable
            columns={simulationColumns}
            data={simulations}
            searchKey="name"
            searchPlaceholder="Simulasyon ara..."
            toolbar={
              <button
                onClick={() => setCreateOpen(true)}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                Yeni Simulasyon
              </button>
            }
          />
        </TabsContent>

        {/* Tab 2: Fixed Expenses */}
        <TabsContent value="fixed-expenses">
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Ad
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Tutar
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant w-16">
                      Sil
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {fixedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant">
                        Henuz sabit gider eklenmemis
                      </td>
                    </tr>
                  ) : (
                    fixedExpenses.map((fe) => (
                      <tr key={fe.id} className="hover:bg-surface-bright transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-on-surface">
                          {fe.name}
                        </td>
                        <td className="px-6 py-4">
                          <InlineEditableAmount
                            value={fe.amount}
                            onSave={(val) => updateFixedExpense.mutate({ id: fe.id, amount: val })}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deleteFixedExpense.mutate(fe.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Form */}
            <div className="p-6 border-t border-outline-variant/15">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!feName.trim()) return
                  createFixedExpense.mutate({
                    name: feName.trim(),
                    amount: parseFloat(feAmount.replace(",", ".")) || 0,
                  })
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">
                    Gider Adi
                  </label>
                  <input
                    value={feName}
                    onChange={(e) => setFeName(e.target.value)}
                    placeholder="Orn: Kira"
                    className={inputClass}
                  />
                </div>
                <div className="w-40">
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">
                    Tutar
                  </label>
                  <input
                    value={feAmount}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                      setFeAmount(cleaned)
                    }}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={createFixedExpense.isPending || !feName.trim()}
                  className="bg-primary text-on-primary px-5 py-3 rounded-lg font-bold text-sm disabled:opacity-50 hover:translate-y-[-1px] active:scale-95 transition-all"
                >
                  Ekle
                </button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Fixed Revenues */}
        <TabsContent value="fixed-revenues">
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Urun Adi
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Miktar
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant w-16">
                      Sil
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {fixedRevenues.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant">
                        Henuz sabit gelir eklenmemis
                      </td>
                    </tr>
                  ) : (
                    fixedRevenues.map((fr) => (
                      <tr key={fr.id} className="hover:bg-surface-bright transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-on-surface">
                          {fr.product?.name ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface">{fr.quantity}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deleteFixedRevenue.mutate(fr.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Form */}
            <div className="p-6 border-t border-outline-variant/15">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!frProductId || !frQuantity) return
                  createFixedRevenue.mutate({
                    productId: frProductId,
                    quantity: parseFloat(frQuantity.replace(",", ".")) || 0,
                  })
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">
                    Urun
                  </label>
                  <Select value={frProductId || undefined} onValueChange={(v) => setFrProductId(v ?? "")}>
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue placeholder="Urun secin">
                        {menuProducts.find((p) => p.id === frProductId)?.name || "Urun secin"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {menuProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">
                    Miktar
                  </label>
                  <input
                    value={frQuantity}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                      setFrQuantity(cleaned)
                    }}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={createFixedRevenue.isPending || !frProductId || !frQuantity}
                  className="bg-primary text-on-primary px-5 py-3 rounded-lg font-bold text-sm disabled:opacity-50 hover:translate-y-[-1px] active:scale-95 transition-all"
                >
                  Ekle
                </button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Simulation Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setNewName("")
            setNewMonth("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Simulasyon</DialogTitle>
            <DialogDescription>
              Simulasyon icin bir ad ve ay belirleyin.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newName.trim() || !newMonth) return
              createSimulation.mutate({ name: newName.trim(), month: newMonth })
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Simulasyon Adi <span className="text-error">*</span>
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Orn: Mart 2026 Tahmini"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Ay <span className="text-error">*</span>
              </label>
              <input
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className={inputClass}
              />
            </div>
            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={createSimulation.isPending || !newName.trim() || !newMonth}
                className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {createSimulation.isPending ? "Olusturuluyor..." : "Olustur"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, simulation: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Simulasyonu Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.simulation?.name}&quot; simulasyonunu silmek istediginize emin misiniz? Bu
              islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.simulation) {
                  deleteSimulation.mutate(deleteDialog.simulation.id)
                }
              }}
              disabled={deleteSimulation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleteSimulation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
