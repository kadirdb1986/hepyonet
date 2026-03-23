"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, addMonths, subMonths } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import { ColumnDef } from "@tanstack/react-table"
import api from "@/lib/api"
import { formatCurrency, cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table/data-table"
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

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  paymentDate: string
  effectiveMonth?: string
  effectiveEndMonth?: string
}

interface ExpenseCategory {
  id: string
  name: string
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  title: z.string().min(1, "Baslik zorunludur"),
  amount: z.string().min(1, "Tutar zorunludur"),
  categoryId: z.string().min(1, "Kategori zorunludur"),
  paymentDate: z.string().min(1, "Odeme tarihi zorunludur"),
  periodType: z.enum(["same", "different", "multi"]),
  effectiveMonth: z.string().optional(),
  effectiveEndMonth: z.string().optional(),
})

type ExpenseForm = z.infer<typeof expenseSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; expense: Expense | null }>({
    open: false,
    expense: null,
  })
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState<{
    open: boolean
    category: ExpenseCategory | null
  }>({ open: false, category: null })

  const month = format(currentDate, "yyyy-MM")
  const monthDisplay = format(currentDate, "MMMM yyyy", { locale: tr })
  const startDate = format(currentDate, "yyyy-MM-01")
  const endDate = format(
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
    "yyyy-MM-dd",
  )

  const goToPreviousMonth = () => setCurrentDate((d) => subMonths(d, 1))
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1))

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", month, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams({ startDate, endDate })
      if (categoryFilter !== "all") params.set("category", categoryFilter)
      return api.get(`/expenses?${params.toString()}`).then((r) => r.data)
    },
  })

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: () => api.get("/expense-categories").then((r) => r.data),
  })

  // ─── Mutations ────────────────────────────────────────────────────────

  const createExpenseMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Gider basariyla eklendi.")
      setAddDialogOpen(false)
    },
    onError: () => toast.error("Gider eklenirken bir hata olustu."),
  })

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Gider basariyla guncellendi.")
      setEditDialogOpen(false)
      setEditingExpense(null)
    },
    onError: () => toast.error("Gider guncellenirken bir hata olustu."),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      toast.success("Gider silindi.")
      setDeleteDialog({ open: false, expense: null })
    },
    onError: () => toast.error("Gider silinirken bir hata olustu."),
  })

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.post("/expense-categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] })
      toast.success("Kategori eklendi.")
      setNewCategoryName("")
    },
    onError: () => toast.error("Kategori eklenirken bir hata olustu."),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/expense-categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] })
      toast.success("Kategori guncellendi.")
      setEditingCategory(null)
      setEditingCategoryName("")
    },
    onError: () => toast.error("Kategori guncellenirken bir hata olustu."),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expense-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] })
      toast.success("Kategori silindi.")
      setDeleteCategoryDialog({ open: false, category: null })
    },
    onError: () => toast.error("Kategori silinirken bir hata olustu."),
  })

  // ─── Form ─────────────────────────────────────────────────────────────

  function ExpenseFormDialog({
    open,
    onOpenChange,
    defaultValues,
    onSubmit,
    isPending,
    title,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultValues?: Partial<ExpenseForm>
    onSubmit: (data: ExpenseForm) => void
    isPending: boolean
    title: string
  }) {
    const {
      register,
      handleSubmit,
      watch,
      control,
      formState: { errors },
    } = useForm<ExpenseForm>({
      resolver: zodResolver(expenseSchema),
      defaultValues: {
        title: "",
        amount: "",
        categoryId: "",
        paymentDate: "",
        periodType: "same",
        effectiveMonth: "",
        effectiveEndMonth: "",
        ...defaultValues,
      },
    })

    const periodType = watch("periodType")

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Baslik</label>
              <input
                {...register("title")}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                placeholder="Gider basligi"
              />
              {errors.title && (
                <p className="text-xs text-error mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Kategori
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue placeholder="Kategori secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-xs text-error mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Tutar</label>
              <input
                {...register("amount")}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                placeholder="0"
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                  e.target.value = cleaned
                  register("amount").onChange(e)
                }}
              />
              {errors.amount && (
                <p className="text-xs text-error mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Odeme Tarihi
              </label>
              <input
                type="date"
                {...register("paymentDate")}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
              />
              {errors.paymentDate && (
                <p className="text-xs text-error mt-1">{errors.paymentDate.message}</p>
              )}
            </div>

            {/* Period Type */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Donem Tipi
              </label>
              <div className="flex gap-2">
                {[
                  { value: "same", label: "Ayni Ay" },
                  { value: "different", label: "Farkli Ay" },
                  { value: "multi", label: "Coklu Ay" },
                ].map((opt) => (
                  <label key={opt.value} className="flex-1">
                    <input
                      type="radio"
                      {...register("periodType")}
                      value={opt.value}
                      className="sr-only peer"
                    />
                    <div className="text-center py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all border border-outline-variant/20 peer-checked:bg-primary peer-checked:text-on-primary peer-checked:border-primary text-on-surface-variant hover:bg-surface-container-high">
                      {opt.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional month fields */}
            {periodType === "different" && (
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Etki Ayi
                </label>
                <input
                  type="month"
                  {...register("effectiveMonth")}
                  className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                />
              </div>
            )}

            {periodType === "multi" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Baslangic Ayi
                  </label>
                  <input
                    type="month"
                    {...register("effectiveMonth")}
                    className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Bitis Ayi
                  </label>
                  <input
                    type="month"
                    {...register("effectiveEndMonth")}
                    className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleAddExpense = (data: ExpenseForm) => {
    const payload: Record<string, unknown> = {
      title: data.title,
      amount: parseFloat(data.amount.replace(",", ".")),
      category: data.categoryId,
      paymentDate: new Date(data.paymentDate).toISOString(),
    }
    if (data.periodType === "different" && data.effectiveMonth) {
      payload.effectiveMonth = data.effectiveMonth
    }
    if (data.periodType === "multi") {
      if (data.effectiveMonth) payload.effectiveMonth = data.effectiveMonth
      if (data.effectiveEndMonth) payload.effectiveEndMonth = data.effectiveEndMonth
    }
    createExpenseMutation.mutate(payload)
  }

  const handleEditExpense = (data: ExpenseForm) => {
    if (!editingExpense) return
    const payload: Record<string, unknown> = {
      title: data.title,
      amount: parseFloat(data.amount.replace(",", ".")),
      category: data.categoryId,
      paymentDate: new Date(data.paymentDate).toISOString(),
    }
    if (data.periodType === "different" && data.effectiveMonth) {
      payload.effectiveMonth = data.effectiveMonth
    }
    if (data.periodType === "multi") {
      if (data.effectiveMonth) payload.effectiveMonth = data.effectiveMonth
      if (data.effectiveEndMonth) payload.effectiveEndMonth = data.effectiveEndMonth
    }
    updateExpenseMutation.mutate({ id: editingExpense.id, data: payload })
  }

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setEditDialogOpen(true)
  }

  // ─── Table columns ───────────────────────────────────────────────────

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((c) => {
      map[c.id] = c.name
    })
    return map
  }, [categories])

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "title",
      header: "Baslik",
      cell: ({ row }) => (
        <span className="font-semibold text-on-surface">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Kategori",
      cell: ({ row }) => (
        <span className="inline-flex h-6 items-center px-2.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {categoryMap[row.original.category] || row.original.category}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Tutar",
      cell: ({ row }) => (
        <span className="font-bold text-error">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Odeme Tarihi",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {format(new Date(row.original.paymentDate), "d MMMM yyyy", { locale: tr })}
        </span>
      ),
    },
    {
      id: "period",
      header: "Donem",
      cell: ({ row }) => {
        const e = row.original
        if (e.effectiveMonth && e.effectiveEndMonth) {
          return (
            <span className="text-sm text-on-surface-variant">
              {e.effectiveMonth} - {e.effectiveEndMonth}
            </span>
          )
        }
        if (e.effectiveMonth) {
          return <span className="text-sm text-on-surface-variant">{e.effectiveMonth}</span>
        }
        return <span className="text-sm text-on-surface-variant/50">Ayni ay</span>
      },
    },
    {
      id: "actions",
      header: "Islemler",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(row.original)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-container/20 transition-colors text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-xl">edit</span>
          </button>
          <button
            onClick={() => setDeleteDialog({ open: true, expense: row.original })}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Gider Yonetimi
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {expenses.length} gider kaydi listeleniyor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCategoryDialogOpen(true)}
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">category</span>
            Kategoriler
          </button>
          <button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Gider Ekle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <span className="text-sm font-bold text-on-surface capitalize min-w-[120px] text-center">
            {monthDisplay}
          </span>
          <button
            onClick={goToNextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="h-9 px-3 bg-surface-container-low border-0 rounded-lg">
            <SelectValue placeholder="Tum kategoriler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum kategoriler</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={expenses}
        searchKey="title"
        searchPlaceholder="Gider ara..."
      />

      {/* Add Expense Dialog */}
      <ExpenseFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddExpense}
        isPending={createExpenseMutation.isPending}
        title="Yeni Gider Ekle"
      />

      {/* Edit Expense Dialog */}
      {editingExpense && (
        <ExpenseFormDialog
          key={editingExpense.id}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEditingExpense(null)
          }}
          defaultValues={{
            title: editingExpense.title,
            amount: String(editingExpense.amount),
            categoryId: editingExpense.category,
            paymentDate: format(new Date(editingExpense.paymentDate), "yyyy-MM-dd"),
            periodType:
              editingExpense.effectiveMonth && editingExpense.effectiveEndMonth
                ? "multi"
                : editingExpense.effectiveMonth
                  ? "different"
                  : "same",
            effectiveMonth: editingExpense.effectiveMonth ?? "",
            effectiveEndMonth: editingExpense.effectiveEndMonth ?? "",
          }}
          onSubmit={handleEditExpense}
          isPending={updateExpenseMutation.isPending}
          title="Gideri Duzenle"
        />
      )}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, expense: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gideri Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.expense?.title}&quot; giderini silmek istediginize emin misiniz?
              Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.expense) {
                  deleteExpenseMutation.mutate(deleteDialog.expense.id)
                }
              }}
              disabled={deleteExpenseMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleteExpenseMutation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gider Kategorileri</DialogTitle>
            <DialogDescription>
              Gider kategorilerini buradan yonetebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          {/* Add new category */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Yeni Kategori
              </label>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    createCategoryMutation.mutate(newCategoryName.trim())
                  }
                }}
                className="w-full px-4 py-2.5 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none text-sm"
                placeholder="Kategori adi"
              />
            </div>
            <button
              onClick={() => {
                if (newCategoryName.trim()) {
                  createCategoryMutation.mutate(newCategoryName.trim())
                }
              }}
              disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
              className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Ekle
            </button>
          </div>

          {/* Category list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">
                Henuz kategori eklenmemis.
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low transition-colors group"
                >
                  {editingCategory?.id === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingCategoryName.trim()) {
                            updateCategoryMutation.mutate({
                              id: cat.id,
                              name: editingCategoryName.trim(),
                            })
                          }
                          if (e.key === "Escape") {
                            setEditingCategory(null)
                            setEditingCategoryName("")
                          }
                        }}
                        autoFocus
                        className="flex-1 px-3 py-1 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 rounded-md text-sm text-on-surface outline-none"
                      />
                      <button
                        onClick={() => {
                          if (editingCategoryName.trim()) {
                            updateCategoryMutation.mutate({
                              id: cat.id,
                              name: editingCategoryName.trim(),
                            })
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded text-secondary"
                      >
                        <span className="material-symbols-outlined text-base">check</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null)
                          setEditingCategoryName("")
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-on-surface">{cat.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCategory(cat)
                            setEditingCategoryName(cat.name)
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-primary-container/20 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteCategoryDialog({ open: true, category: cat })}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirm */}
      <Dialog
        open={deleteCategoryDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryDialog({ open: false, category: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategoriyi Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteCategoryDialog.category?.name}&quot; kategorisini silmek istediginize
              emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteCategoryDialog.category) {
                  deleteCategoryMutation.mutate(deleteCategoryDialog.category.id)
                }
              }}
              disabled={deleteCategoryMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleteCategoryMutation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
