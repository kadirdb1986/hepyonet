"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import api from "@/lib/api"
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  displayOrder?: number
  _count?: { products: number }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, "Kategori adi zorunludur"),
})

type CategoryForm = z.infer<typeof categorySchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    category: Category | null
  }>({ open: false, category: null })
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    category: Category | null
  }>({ open: false, category: null })

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  })

  // Sort by displayOrder if available
  const sortedCategories = [...categories].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  )

  // ─── Mutations ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Kategori basariyla eklendi.")
      setAddDialogOpen(false)
      addForm.reset()
    },
    onError: () => toast.error("Kategori eklenirken bir hata olustu."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Kategori guncellendi.")
      setEditDialog({ open: false, category: null })
    },
    onError: () => toast.error("Kategori guncellenirken bir hata olustu."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Kategori silindi.")
      setDeleteDialog({ open: false, category: null })
    },
    onError: () => toast.error("Kategori silinirken bir hata olustu."),
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) =>
      api.patch("/categories/order", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: () => toast.error("Siralama guncellenirken bir hata olustu."),
  })

  // ─── Reorder Handlers ─────────────────────────────────────────────────

  const moveCategory = (index: number, direction: "up" | "down") => {
    const newArr = [...sortedCategories]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newArr.length) return
    ;[newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]]
    const items = newArr.map((cat, i) => ({ id: cat.id, displayOrder: i }))
    reorderMutation.mutate(items)
  }

  // ─── Forms ────────────────────────────────────────────────────────────

  const addForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  })

  const editForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    values: editDialog.category ? { name: editDialog.category.name } : { name: "" },
  })

  // ─── Table Columns ────────────────────────────────────────────────────

  const columns: ColumnDef<Category>[] = [
    {
      id: "order",
      header: "Sira",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-on-surface-variant">
          {row.index + 1}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Kategori Adi",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-fixed text-lg">
              category
            </span>
          </div>
          <span className="font-semibold text-on-surface">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "productCount",
      header: "Urun Sayisi",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {row.original._count?.products ?? 0} urun
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "reorder",
      header: "Sirala",
      cell: ({ row }) => {
        const index = sortedCategories.findIndex((c) => c.id === row.original.id)
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => moveCategory(index, "up")}
              disabled={index === 0 || reorderMutation.isPending}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-xl">arrow_upward</span>
            </button>
            <button
              onClick={() => moveCategory(index, "down")}
              disabled={
                index === sortedCategories.length - 1 || reorderMutation.isPending
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-xl">arrow_downward</span>
            </button>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Islemler",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditDialog({ open: true, category: row.original })}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-xl">edit</span>
          </button>
          <button
            onClick={() => setDeleteDialog({ open: true, category: row.original })}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ]

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/dashboard/products" className="hover:text-on-surface transition-colors">
          Urunler
        </Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface font-medium">Kategoriler</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Kategoriler
          </h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            {categories.length} kategori tanimli.
          </p>
        </div>
        <button
          onClick={() => {
            addForm.reset()
            setAddDialogOpen(true)
          }}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Kategori Ekle
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={sortedCategories}
        searchKey="name"
        searchPlaceholder="Kategori ara..."
      />

      {/* Add Category Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false)
            addForm.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kategori</DialogTitle>
            <DialogDescription>
              Urunler icin yeni bir kategori olusturun.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data.name))}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Kategori Adi <span className="text-error">*</span>
              </label>
              <input
                {...addForm.register("name")}
                placeholder="Orn: Pizzalar, Icecekler, Tatlilar..."
                className={inputClass}
              />
              {addForm.formState.errors.name && (
                <p className="text-xs text-error mt-1">
                  {addForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditDialog({ open: false, category: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategoriyi Duzenle</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) => {
              if (editDialog.category) {
                updateMutation.mutate({ id: editDialog.category.id, name: data.name })
              }
            })}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Kategori Adi <span className="text-error">*</span>
              </label>
              <input
                {...editForm.register("name")}
                placeholder="Kategori adi"
                className={inputClass}
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-error mt-1">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, category: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategoriyi Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.category?.name}&quot; kategorisini silmek istediginize emin
              misiniz? Bu kategoriye bagli urunler etkilenebilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.category) {
                  deleteMutation.mutate(deleteDialog.category.id)
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
