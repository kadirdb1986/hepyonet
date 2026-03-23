"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
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

interface Category {
  id: string
  name: string
}

interface ProductIngredient {
  id: string
  rawMaterialId?: string
  subProductId?: string
  quantity: number
  unit: string
  rawMaterial?: { id: string; name: string; unit: string }
  subProduct?: { id: string; name: string }
}

interface Product {
  id: string
  name: string
  code?: string
  description?: string
  image?: string
  price?: number
  isMenuItem: boolean
  isComposite?: boolean
  categoryId?: string
  category?: Category
  calculatedCost?: number
  ingredients?: ProductIngredient[]
}

interface RawMaterial {
  id: string
  name: string
  unit: string
  lastPurchasePrice: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProductType(product: Product): "direct" | "recipe" | "composite" {
  const ingredients = product.ingredients || []
  if (product.isComposite || ingredients.some((i) => i.subProductId)) return "composite"
  if (ingredients.length === 0) return "direct"
  if (ingredients.length === 1 && ingredients[0].unit === "ADET") return "direct"
  return "recipe"
}

function getProductTypeBadge(product: Product) {
  const type = getProductType(product)
  switch (type) {
    case "direct":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant">
          Direkt Satis
        </span>
      )
    case "recipe":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed">
          Receteli
        </span>
      )
    case "composite":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-error-container text-on-error-container">
          Kompozit
        </span>
      )
  }
}

function getMarginBadge(price: number, cost: number) {
  if (!price || price === 0) return <span className="text-on-surface-variant/50">-</span>
  const margin = ((price - cost) / price) * 100
  if (margin >= 30) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-fixed text-on-secondary-fixed">
        %{margin.toFixed(1)}
      </span>
    )
  }
  if (margin >= 15) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
        %{margin.toFixed(1)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-error-container text-on-error-container">
      %{margin.toFixed(1)}
    </span>
  )
}

function ProductAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm">
      {initials}
    </div>
  )
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const quickCreateSchema = z.object({
  rawMaterialId: z.string().min(1, "Stok kalemi secin"),
  price: z.string().min(1, "Satis fiyati zorunludur"),
})

type QuickCreateForm = z.infer<typeof quickCreateSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  })
  const [search, setSearch] = useState("")

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then((r) => r.data),
  })

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["raw-materials"],
    queryFn: () => api.get("/raw-materials").then((r) => r.data),
  })

  // ─── Filtered Data ────────────────────────────────────────────────────

  const searchLower = search.toLowerCase()

  const menuProducts = useMemo(
    () =>
      products
        .filter((p) => p.isMenuItem)
        .filter(
          (p) =>
            !search ||
            p.name.toLowerCase().includes(searchLower) ||
            p.code?.toLowerCase().includes(searchLower) ||
            p.category?.name.toLowerCase().includes(searchLower)
        ),
    [products, search, searchLower]
  )

  const intermediateProducts = useMemo(
    () =>
      products
        .filter((p) => !p.isMenuItem)
        .filter(
          (p) =>
            !search ||
            p.name.toLowerCase().includes(searchLower) ||
            p.code?.toLowerCase().includes(searchLower) ||
            p.category?.name.toLowerCase().includes(searchLower)
        ),
    [products, search, searchLower]
  )

  // ─── Mutations ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Urun basariyla silindi.")
      setDeleteDialog({ open: false, product: null })
    },
    onError: () => toast.error("Urun silinirken bir hata olustu."),
  })

  const quickCreateMutation = useMutation({
    mutationFn: async (data: QuickCreateForm) => {
      const material = rawMaterials.find((m) => m.id === data.rawMaterialId)
      if (!material) throw new Error("Malzeme bulunamadi")
      const productRes = await api.post("/products", {
        name: material.name,
        price: parseFloat(data.price.replace(",", ".")),
        isMenuItem: true,
      })
      const productId = productRes.data.id
      await api.post(`/products/${productId}/ingredients`, {
        rawMaterialId: material.id,
        quantity: 1,
        unit: material.unit,
      })
      return productRes.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Urun basariyla olusturuldu.")
      setQuickCreateOpen(false)
      router.push(`/dashboard/products/${data.id}`)
    },
    onError: () => toast.error("Urun olusturulurken bir hata olustu."),
  })

  // ─── Quick Create Form ────────────────────────────────────────────────

  const quickForm = useForm<QuickCreateForm>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: { rawMaterialId: "", price: "" },
  })

  const selectedMaterial = rawMaterials.find(
    (m) => m.id === quickForm.watch("rawMaterialId")
  )

  // ─── Table Columns ────────────────────────────────────────────────────

  const menuColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Ad",
      cell: ({ row }) => (
        <Link
          href={`/dashboard/products/${row.original.id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <ProductAvatar name={row.original.name} />
          <span className="font-semibold text-on-surface">{row.original.name}</span>
        </Link>
      ),
    },
    {
      accessorKey: "code",
      header: "Kod",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface-variant font-mono">
          {row.original.code || "-"}
        </span>
      ),
    },
    {
      id: "category",
      header: "Kategori",
      cell: ({ row }) =>
        row.original.category ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            {row.original.category.name}
          </span>
        ) : (
          <span className="text-on-surface-variant/50">-</span>
        ),
    },
    {
      id: "price",
      header: "Satis Fiyati",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-on-surface">
          {row.original.price ? formatCurrencyDecimal(row.original.price) : "-"}
        </span>
      ),
    },
    {
      id: "cost",
      header: "Maliyet",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {row.original.calculatedCost != null
            ? formatCurrencyDecimal(row.original.calculatedCost)
            : "-"}
        </span>
      ),
    },
    {
      id: "margin",
      header: "Kar Marji",
      cell: ({ row }) =>
        getMarginBadge(row.original.price || 0, row.original.calculatedCost || 0),
    },
    {
      id: "type",
      header: "Tip",
      cell: ({ row }) => getProductTypeBadge(row.original),
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
              onClick={() => router.push(`/dashboard/products/${row.original.id}`)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              Detay
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteDialog({ open: true, product: row.original })}
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

  const inputClass =
    "w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Urunler
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {products.length} urun listeleniyor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products/categories"
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">category</span>
            Kategoriler
          </Link>
          <button
            onClick={() => {
              quickForm.reset()
              setQuickCreateOpen(true)
            }}
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Stok Kaleminden Urun Olustur
          </button>
          <Link
            href="/dashboard/products/new"
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Yeni Urun
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-0 rounded-lg focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest outline-none transition-all placeholder:text-outline/50 text-on-surface"
          placeholder="Urun adi, kodu veya kategori ara..."
        />
      </div>

      {/* Menu Products Table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">restaurant_menu</span>
          <h2 className="text-lg font-bold text-on-surface">Menu Urunleri</h2>
          <span className="text-sm text-on-surface-variant">({menuProducts.length})</span>
        </div>
        <DataTable columns={menuColumns} data={menuProducts} pageSize={10} />
      </div>

      {/* Intermediate Products Card Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">science</span>
          <h2 className="text-lg font-bold text-on-surface">Ara Urunler</h2>
          <span className="text-sm text-on-surface-variant">
            ({intermediateProducts.length})
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intermediateProducts.map((product) => (
            <div
              key={product.id}
              className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.06)] flex items-start gap-4 group"
            >
              <ProductAvatar name={product.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-on-surface">{product.name}</h3>
                    {product.code && (
                      <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                        {product.code}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </Link>
                    <button
                      onClick={() => setDeleteDialog({ open: true, product })}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {product.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {product.category.name}
                    </span>
                  )}
                  {product.calculatedCost != null && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
                      {formatCurrencyDecimal(product.calculatedCost)}
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    {product.ingredients?.length || 0} malzeme
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <Link
            href="/dashboard/products/new"
            className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.06)] flex items-center justify-center gap-3 border-2 border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-primary-fixed/10 transition-all min-h-[120px]"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl">add</span>
            <span className="text-sm font-semibold text-on-surface-variant">Yeni Ekle</span>
          </Link>
        </div>
      </div>

      {/* Quick Create Dialog */}
      <Dialog
        open={quickCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setQuickCreateOpen(false)
            quickForm.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Kaleminden Urun Olustur</DialogTitle>
            <DialogDescription>
              Bir stok kalemi secip satis fiyati belirleyin. Urun otomatik olarak olusturulacaktir.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={quickForm.handleSubmit((data) => quickCreateMutation.mutate(data))}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Stok Kalemi <span className="text-error">*</span>
              </label>
              <Controller
                name="rawMaterialId"
                control={quickForm.control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue placeholder="Stok kalemi secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {quickForm.formState.errors.rawMaterialId && (
                <p className="text-xs text-error mt-1">
                  {quickForm.formState.errors.rawMaterialId.message}
                </p>
              )}
            </div>

            {selectedMaterial && (
              <div className="bg-surface-container-low rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Son Alis Fiyati</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrencyDecimal(selectedMaterial.lastPurchasePrice)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Satis Fiyati <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  {...quickForm.register("price")}
                  className={`${inputClass} pr-10`}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    quickForm.register("price").onChange(e)
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">
                  &#8378;
                </span>
              </div>
              {quickForm.formState.errors.price && (
                <p className="text-xs text-error mt-1">
                  {quickForm.formState.errors.price.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={quickCreateMutation.isPending}
                className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {quickCreateMutation.isPending ? "Olusturuluyor..." : "Olustur"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, product: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Urunu Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.product?.name}&quot; urununu silmek istediginize emin misiniz? Bu
              islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.product) {
                  deleteMutation.mutate(deleteDialog.product.id)
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
