"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ColumnDef } from "@tanstack/react-table"
import api from "@/lib/api"
import { formatCurrencyDecimal, cn } from "@/lib/utils"
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawMaterial {
  id: string
  name: string
  type?: string
  unit: "KG" | "GR" | "LT" | "ML" | "ADET"
  currentStock: number
  lastPurchasePrice: number
  minStockLevel: number
  supplierId?: string
  supplier?: { id: string; name: string }
  materialType?: { id: string; name: string }
}

interface MaterialType {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface LowStockResponse {
  count: number
  items: RawMaterial[]
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const materialSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  typeId: z.string().optional(),
  unit: z.string().min(1, "Birim zorunludur"),
  currentStock: z.string().optional(),
  lastPurchasePrice: z.string().optional(),
  minStockLevel: z.string().optional(),
  supplierId: z.string().optional(),
})

type MaterialForm = z.infer<typeof materialSchema>

const UNIT_DISPLAY: Record<string, string> = {
  KG: "kg",
  GR: "gr",
  LT: "lt",
  ML: "ml",
  ADET: "adet",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; material: RawMaterial | null }>({
    open: false,
    material: null,
  })
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null)
  const [editingTypeName, setEditingTypeName] = useState("")
  const [deleteTypeDialog, setDeleteTypeDialog] = useState<{
    open: boolean
    type: MaterialType | null
  }>({ open: false, type: null })

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["raw-materials"],
    queryFn: () => api.get("/raw-materials").then((r) => r.data),
  })

  const { data: lowStockData } = useQuery<LowStockResponse>({
    queryKey: ["raw-materials-low-stock"],
    queryFn: () => api.get("/raw-materials/low-stock").then((r) => r.data),
  })

  const { data: materialTypes = [] } = useQuery<MaterialType[]>({
    queryKey: ["material-types"],
    queryFn: () => api.get("/material-types").then((r) => r.data),
  })

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/suppliers").then((r) => r.data),
  })

  const lowStockCount = lowStockData?.count ?? (Array.isArray(lowStockData) ? (lowStockData as RawMaterial[]).length : 0)

  // ─── Filtered data ──────────────────────────────────────────────────

  const filteredMaterials = useMemo(() => {
    if (typeFilter === "all") return rawMaterials
    return rawMaterials.filter(
      (m) => m.materialType?.id === typeFilter || m.type === typeFilter
    )
  }, [rawMaterials, typeFilter])

  // ─── Mutations ────────────────────────────────────────────────────────

  const createMaterialMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/raw-materials", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] })
      queryClient.invalidateQueries({ queryKey: ["raw-materials-low-stock"] })
      toast.success("Stok kalemi basariyla eklendi.")
      setAddDialogOpen(false)
    },
    onError: () => toast.error("Stok kalemi eklenirken bir hata olustu."),
  })

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/raw-materials/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] })
      queryClient.invalidateQueries({ queryKey: ["raw-materials-low-stock"] })
      toast.success("Stok kalemi basariyla guncellendi.")
      setEditDialogOpen(false)
      setEditingMaterial(null)
    },
    onError: () => toast.error("Stok kalemi guncellenirken bir hata olustu."),
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/raw-materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] })
      queryClient.invalidateQueries({ queryKey: ["raw-materials-low-stock"] })
      toast.success("Stok kalemi silindi.")
      setDeleteDialog({ open: false, material: null })
    },
    onError: () => toast.error("Stok kalemi silinirken bir hata olustu."),
  })

  // Material type mutations
  const createTypeMutation = useMutation({
    mutationFn: (name: string) => api.post("/material-types", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-types"] })
      toast.success("Malzeme tipi eklendi.")
      setNewTypeName("")
    },
    onError: () => toast.error("Malzeme tipi eklenirken bir hata olustu."),
  })

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/material-types/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-types"] })
      toast.success("Malzeme tipi guncellendi.")
      setEditingType(null)
      setEditingTypeName("")
    },
    onError: () => toast.error("Malzeme tipi guncellenirken bir hata olustu."),
  })

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/material-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-types"] })
      toast.success("Malzeme tipi silindi.")
      setDeleteTypeDialog({ open: false, type: null })
    },
    onError: () => toast.error("Malzeme tipi silinirken bir hata olustu."),
  })

  // ─── Form Dialog ──────────────────────────────────────────────────────

  function MaterialFormDialog({
    open,
    onOpenChange,
    defaultValues,
    onSubmit,
    isPending,
    title,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultValues?: Partial<MaterialForm>
    onSubmit: (data: MaterialForm) => void
    isPending: boolean
    title: string
  }) {
    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
    } = useForm<MaterialForm>({
      resolver: zodResolver(materialSchema),
      defaultValues: {
        name: "",
        typeId: "",
        unit: "",
        currentStock: "",
        lastPurchasePrice: "",
        minStockLevel: "",
        supplierId: "",
        ...defaultValues,
      },
    })

    const inputClass =
      "w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Ad</label>
              <input
                {...register("name")}
                className={inputClass}
                placeholder="Malzeme adi"
              />
              {errors.name && (
                <p className="text-xs text-error mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">Tip</label>
                <Controller
                  name="typeId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Tip secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Unit */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">Birim</label>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Birim secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {(["KG", "GR", "LT", "ML", "ADET"] as const).map((u) => (
                          <SelectItem key={u} value={u}>
                            {UNIT_DISPLAY[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.unit && (
                  <p className="text-xs text-error mt-1">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Current Stock */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Mevcut Stok
                </label>
                <input
                  {...register("currentStock")}
                  className={inputClass}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    register("currentStock").onChange(e)
                  }}
                />
              </div>

              {/* Last Purchase Price */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Son Alis Fiyati
                </label>
                <input
                  {...register("lastPurchasePrice")}
                  className={inputClass}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    register("lastPurchasePrice").onChange(e)
                  }}
                />
              </div>

              {/* Min Stock Level */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Min Stok
                </label>
                <input
                  {...register("minStockLevel")}
                  className={inputClass}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    register("minStockLevel").onChange(e)
                  }}
                />
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Tedarikci
              </label>
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue placeholder="Tedarikci secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

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

  const handleAddMaterial = (data: MaterialForm) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      unit: data.unit,
    }
    if (data.typeId) payload.type = data.typeId
    if (data.currentStock) payload.currentStock = parseFloat(data.currentStock.replace(",", "."))
    if (data.lastPurchasePrice) payload.lastPurchasePrice = parseFloat(data.lastPurchasePrice.replace(",", "."))
    if (data.minStockLevel) payload.minStockLevel = parseFloat(data.minStockLevel.replace(",", "."))
    if (data.supplierId) payload.supplierId = data.supplierId
    createMaterialMutation.mutate(payload)
  }

  const handleEditMaterial = (data: MaterialForm) => {
    if (!editingMaterial) return
    const payload: Record<string, unknown> = {
      name: data.name,
      unit: data.unit,
    }
    if (data.typeId) payload.type = data.typeId
    if (data.currentStock) payload.currentStock = parseFloat(data.currentStock.replace(",", "."))
    if (data.lastPurchasePrice) payload.lastPurchasePrice = parseFloat(data.lastPurchasePrice.replace(",", "."))
    if (data.minStockLevel) payload.minStockLevel = parseFloat(data.minStockLevel.replace(",", "."))
    if (data.supplierId) payload.supplierId = data.supplierId
    updateMaterialMutation.mutate({ id: editingMaterial.id, data: payload })
  }

  const handleOpenEdit = (material: RawMaterial) => {
    setEditingMaterial(material)
    setEditDialogOpen(true)
  }

  // ─── Table columns ───────────────────────────────────────────────────

  const columns: ColumnDef<RawMaterial>[] = [
    {
      accessorKey: "name",
      header: "Ad",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-fixed text-lg">package_2</span>
          </div>
          <span className="font-semibold text-on-surface">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "type",
      header: "Tip",
      cell: ({ row }) => {
        const typeName = row.original.materialType?.name
        return typeName ? (
          <span className="inline-flex h-6 items-center px-2.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {typeName}
          </span>
        ) : (
          <span className="text-on-surface-variant/50">-</span>
        )
      },
    },
    {
      id: "supplier",
      header: "Tedarikci",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {row.original.supplier?.name || "-"}
        </span>
      ),
    },
    {
      accessorKey: "currentStock",
      header: "Mevcut Stok",
      cell: ({ row }) => (
        <span className="font-semibold text-on-surface">
          {row.original.currentStock.toLocaleString("tr-TR")} {UNIT_DISPLAY[row.original.unit] || row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: "minStockLevel",
      header: "Min Stok Seviyesi",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {row.original.minStockLevel.toLocaleString("tr-TR")} {UNIT_DISPLAY[row.original.unit] || row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: "lastPurchasePrice",
      header: "Son Alis Fiyati",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-on-surface">
          {formatCurrencyDecimal(row.original.lastPurchasePrice)}
        </span>
      ),
    },
    {
      id: "stockStatus",
      header: "Stok Durumu",
      cell: ({ row }) => {
        const { currentStock, minStockLevel: minStock } = row.original
        const percent =
          minStock > 0
            ? Math.min(100, Math.max(5, (currentStock / (minStock * 5)) * 100))
            : 100
        const isLow = minStock > 0 && currentStock <= minStock
        return (
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isLow ? "bg-error" : "bg-secondary"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span
              className={cn(
                "inline-flex h-6 items-center px-2 rounded-full text-xs font-semibold shrink-0",
                isLow
                  ? "bg-error-container text-on-error-container"
                  : "bg-secondary-fixed text-on-secondary-fixed"
              )}
            >
              {isLow ? "Kritik" : "Normal"}
            </span>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Islemler",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant outline-none">
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleOpenEdit(row.original)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Duzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteDialog({ open: true, material: row.original })}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            Stok Yonetimi
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {rawMaterials.length} stok kalemi listeleniyor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTypeDialogOpen(true)}
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">category</span>
            Malzeme Tipleri
          </button>
          <button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Stok Kalemi Ekle
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="bg-error-container/20 p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-2xl">warning</span>
          <div>
            <p className="text-sm font-bold text-on-surface">
              {lowStockCount} urun kritik stok seviyesinin altinda
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Bu urunlerin stok seviyelerini kontrol edin.
            </p>
          </div>
        </div>
      )}

      {/* Type Filter Tabs */}
      <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 overflow-x-auto">
        <button
          onClick={() => setTypeFilter("all")}
          className={cn(
            typeFilter === "all"
              ? "bg-surface-container-lowest shadow-sm text-sm font-bold rounded-md px-4 py-1.5"
              : "text-on-surface-variant text-sm font-semibold px-4 py-1.5"
          )}
        >
          Tumu
        </button>
        {materialTypes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            className={cn(
              typeFilter === t.id
                ? "bg-surface-container-lowest shadow-sm text-sm font-bold rounded-md px-4 py-1.5"
                : "text-on-surface-variant text-sm font-semibold px-4 py-1.5"
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredMaterials}
        searchKey="name"
        searchPlaceholder="Malzeme ara..."
      />

      {/* Add Material Dialog */}
      <MaterialFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddMaterial}
        isPending={createMaterialMutation.isPending}
        title="Yeni Stok Kalemi Ekle"
      />

      {/* Edit Material Dialog */}
      {editingMaterial && (
        <MaterialFormDialog
          key={editingMaterial.id}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEditingMaterial(null)
          }}
          defaultValues={{
            name: editingMaterial.name,
            typeId: editingMaterial.materialType?.id || editingMaterial.type || "",
            unit: editingMaterial.unit,
            currentStock: String(editingMaterial.currentStock || ""),
            lastPurchasePrice: String(editingMaterial.lastPurchasePrice || ""),
            minStockLevel: String(editingMaterial.minStockLevel || ""),
            supplierId: editingMaterial.supplier?.id || editingMaterial.supplierId || "",
          }}
          onSubmit={handleEditMaterial}
          isPending={updateMaterialMutation.isPending}
          title="Stok Kalemini Duzenle"
        />
      )}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, material: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Kalemini Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.material?.name}&quot; stok kalemini silmek istediginize emin
              misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.material) {
                  deleteMaterialMutation.mutate(deleteDialog.material.id)
                }
              }}
              disabled={deleteMaterialMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleteMaterialMutation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Type Management Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Malzeme Tipleri</DialogTitle>
            <DialogDescription>
              Malzeme tiplerini buradan yonetebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          {/* Add new type */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Yeni Tip
              </label>
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTypeName.trim()) {
                    createTypeMutation.mutate(newTypeName.trim())
                  }
                }}
                className="w-full px-4 py-2.5 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none text-sm"
                placeholder="Tip adi"
              />
            </div>
            <button
              onClick={() => {
                if (newTypeName.trim()) {
                  createTypeMutation.mutate(newTypeName.trim())
                }
              }}
              disabled={!newTypeName.trim() || createTypeMutation.isPending}
              className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Ekle
            </button>
          </div>

          {/* Type list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {materialTypes.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">
                Henuz malzeme tipi eklenmemis.
              </p>
            ) : (
              materialTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low transition-colors group"
                >
                  {editingType?.id === t.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editingTypeName}
                        onChange={(e) => setEditingTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingTypeName.trim()) {
                            updateTypeMutation.mutate({
                              id: t.id,
                              name: editingTypeName.trim(),
                            })
                          }
                          if (e.key === "Escape") {
                            setEditingType(null)
                            setEditingTypeName("")
                          }
                        }}
                        autoFocus
                        className="flex-1 px-3 py-1 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 rounded-md text-sm text-on-surface outline-none"
                      />
                      <button
                        onClick={() => {
                          if (editingTypeName.trim()) {
                            updateTypeMutation.mutate({
                              id: t.id,
                              name: editingTypeName.trim(),
                            })
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded text-secondary"
                      >
                        <span className="material-symbols-outlined text-base">check</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingType(null)
                          setEditingTypeName("")
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-on-surface">{t.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingType(t)
                            setEditingTypeName(t.name)
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-primary-container/20 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTypeDialog({ open: true, type: t })}
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

      {/* Delete Type Confirm */}
      <Dialog
        open={deleteTypeDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteTypeDialog({ open: false, type: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Malzeme Tipini Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteTypeDialog.type?.name}&quot; tipini silmek istediginize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteTypeDialog.type) {
                  deleteTypeMutation.mutate(deleteTypeDialog.type.id)
                }
              }}
              disabled={deleteTypeMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleteTypeMutation.isPending ? "Siliniyor..." : "Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
