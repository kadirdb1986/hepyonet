"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ColumnDef } from "@tanstack/react-table"
import api from "@/lib/api"
import { formatPhone } from "@/lib/utils"
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

interface Supplier {
  id: string
  name: string
  description?: string
  deliveryType?: string
  phone?: string
}

interface RawMaterial {
  id: string
  supplierId?: string
  supplier?: { id: string }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const supplierSchema = z.object({
  name: z.string().min(1, "Tedarikçi adı zorunludur"),
  description: z.string().optional(),
  deliveryType: z.string().optional(),
  phone: z.string().optional(),
})

type SupplierForm = z.infer<typeof supplierSchema>

const DELIVERY_TYPES = [
  { value: "Kargo", label: "Kargo" },
  { value: "Ayağa Hizmet", label: "Ayağa Hizmet" },
  { value: "Kendin Alıyorsun", label: "Kendin Alıyorsun" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<SupplierForm>({
    name: "",
    description: "",
    deliveryType: "",
    phone: "",
  })
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    supplier: Supplier | null
  }>({ open: false, supplier: null })

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/suppliers").then((r) => r.data),
  })

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["raw-materials"],
    queryFn: () => api.get("/raw-materials").then((r) => r.data),
  })

  // Count materials per supplier
  const supplierMaterialCount = useMemo(() => {
    const counts: Record<string, number> = {}
    rawMaterials.forEach((m) => {
      const sid = m.supplier?.id || m.supplierId
      if (sid) {
        counts[sid] = (counts[sid] || 0) + 1
      }
    })
    return counts
  }, [rawMaterials])

  // ─── Add Form ─────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      description: "",
      deliveryType: "",
      phone: "",
    },
  })

  // ─── Mutations ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Tedarikçi başarıyla eklendi.")
      reset()
      setAddDialogOpen(false)
    },
    onError: () => toast.error("Tedarikçi eklenirken bir hata oluştu."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Tedarikçi başarıyla güncellendi.")
      setEditingId(null)
    },
    onError: () => toast.error("Tedarikçi güncellenirken bir hata oluştu."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Tedarikçi silindi.")
      setDeleteDialog({ open: false, supplier: null })
    },
    onError: () => toast.error("Tedarikçi silinirken bir hata oluştu."),
  })

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleAdd = (data: SupplierForm) => {
    const payload: Record<string, unknown> = { name: data.name }
    if (data.description) payload.description = data.description
    if (data.deliveryType) payload.deliveryType = data.deliveryType
    if (data.phone) payload.phone = data.phone
    createMutation.mutate(payload)
  }

  const handleStartEdit = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setEditForm({
      name: supplier.name,
      description: supplier.description || "",
      deliveryType: supplier.deliveryType || "",
      phone: supplier.phone || "",
    })
  }

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) {
      toast.error("Tedarikçi adı zorunludur.")
      return
    }
    const payload: Record<string, unknown> = { name: editForm.name.trim() }
    if (editForm.description) payload.description = editForm.description
    if (editForm.deliveryType) payload.deliveryType = editForm.deliveryType
    if (editForm.phone) payload.phone = editForm.phone
    updateMutation.mutate({ id, data: payload })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  // ─── Table columns ───────────────────────────────────────────────────

  const inputClass =
    "w-full px-3 py-1.5 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-md transition-all text-on-surface outline-none text-sm"

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Ad",
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
              autoFocus
            />
          )
        }
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-fixed text-lg">local_shipping</span>
            </div>
            <span className="font-semibold text-on-surface">{row.original.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      header: "Açıklama",
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <input
              value={editForm.description || ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, description: e.target.value }))
              }
              className={inputClass}
            />
          )
        }
        return (
          <span className="text-sm text-on-surface-variant">
            {row.original.description || "-"}
          </span>
        )
      },
    },
    {
      accessorKey: "deliveryType",
      header: "Teslimat Tipi",
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <select
              value={editForm.deliveryType || ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, deliveryType: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Seçin</option>
              {DELIVERY_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          )
        }
        return row.original.deliveryType ? (
          <span className="inline-flex h-6 items-center px-2.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold">
            {row.original.deliveryType}
          </span>
        ) : (
          <span className="text-on-surface-variant/50">-</span>
        )
      },
    },
    {
      accessorKey: "phone",
      header: "Telefon",
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <input
              value={editForm.phone || ""}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, phone: e.target.value }))
              }
              className={inputClass}
              placeholder="05XX XXX XX XX"
            />
          )
        }
        return (
          <span className="text-sm text-on-surface">
            {row.original.phone ? formatPhone(row.original.phone) : "-"}
          </span>
        )
      },
    },
    {
      id: "materialCount",
      header: "Kalem Sayısı",
      cell: ({ row }) => {
        const count = supplierMaterialCount[row.original.id] || 0
        return (
          <span className="inline-flex h-6 items-center px-2.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {count} kalem
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: ({ row }) => {
        if (editingId === row.original.id) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSaveEdit(row.original.id)}
                disabled={updateMutation.isPending}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary-fixed/30 transition-colors text-secondary"
              >
                <span className="material-symbols-outlined text-xl">check</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleStartEdit(row.original)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-container/20 transition-colors text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button
              onClick={() => setDeleteDialog({ open: true, supplier: row.original })}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        )
      },
      enableSorting: false,
    },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/dashboard/inventory" className="hover:text-on-surface transition-colors">
          Stok
        </Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface font-medium">Tedarikçiler</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Tedarikçiler
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {suppliers.length} tedarikçi listeleniyor.
          </p>
        </div>
        <button
          onClick={() => { reset(); setAddDialogOpen(true) }}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Tedarikçi Ekle
        </button>
      </div>

      {/* Add Supplier Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAdd)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Ad</label>
              <input
                {...register("name")}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                placeholder="Tedarikçi adı"
              />
              {errors.name && (
                <p className="text-xs text-error mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Delivery Type */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Teslimat Tipi
              </label>
              <Controller
                name="deliveryType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue placeholder="Tip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value}>
                          {dt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Telefon</label>
              <input
                {...register("phone")}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                placeholder="05XX XXX XX XX"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Açıklama</label>
              <textarea
                {...register("description")}
                rows={2}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none resize-none"
                placeholder="Tedarikçi hakkında kısa bir açıklama"
              />
            </div>

            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                İptal
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={suppliers}
        searchKey="name"
        searchPlaceholder="Tedarikçi ara..."
        pageSize={50}
      />

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, supplier: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tedarikçiyi Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.supplier?.name}&quot; tedarikçisini silmek istediğinize emin
              misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              İptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.supplier) {
                  deleteMutation.mutate(deleteDialog.supplier.id)
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
