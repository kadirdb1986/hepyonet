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
  name: z.string().min(1, "Tedarikci adi zorunludur"),
  description: z.string().optional(),
  deliveryType: z.string().optional(),
  phone: z.string().optional(),
})

type SupplierForm = z.infer<typeof supplierSchema>

const DELIVERY_TYPES = [
  { value: "Kargo", label: "Kargo" },
  { value: "Ayağa Hizmet", label: "Ayaga Hizmet" },
  { value: "Kendin Alıyorsun", label: "Kendin Aliyorsun" },
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
      toast.success("Tedarikci basariyla eklendi.")
      reset()
    },
    onError: () => toast.error("Tedarikci eklenirken bir hata olustu."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Tedarikci basariyla guncellendi.")
      setEditingId(null)
    },
    onError: () => toast.error("Tedarikci guncellenirken bir hata olustu."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Tedarikci silindi.")
      setDeleteDialog({ open: false, supplier: null })
    },
    onError: () => toast.error("Tedarikci silinirken bir hata olustu."),
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
      toast.error("Tedarikci adi zorunludur.")
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
      header: "Aciklama",
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
              <option value="">Secin</option>
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
      header: "Kalem Sayisi",
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
      header: "Islemler",
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
        <span className="text-on-surface font-medium">Tedarikciler</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Tedarikciler
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {suppliers.length} tedarikci listeleniyor.
          </p>
        </div>
      </div>

      {/* Add Supplier Form Card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.06)] mb-8">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
          Yeni Tedarikci Ekle
        </h2>
        <form onSubmit={handleSubmit(handleAdd)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Ad</label>
              <input
                {...register("name")}
                className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"
                placeholder="Tedarikci adi"
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
                      <SelectValue placeholder="Tip secin" />
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
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-on-surface mb-1.5 block">Aciklama</label>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none resize-none"
              placeholder="Tedarikci hakkinda kisa bir aciklama"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </button>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={suppliers}
        searchKey="name"
        searchPlaceholder="Tedarikci ara..."
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
            <DialogTitle>Tedarikciyi Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.supplier?.name}&quot; tedarikcisini silmek istediginize emin
              misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
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
