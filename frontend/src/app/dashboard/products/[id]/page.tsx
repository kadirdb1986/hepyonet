"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrencyDecimal, cn } from "@/lib/utils"
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
import { Checkbox } from "@/components/ui/checkbox"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface RawMaterial {
  id: string
  name: string
  unit: string
  lastPurchasePrice: number
}

interface ProductIngredient {
  id: string
  rawMaterialId?: string
  subProductId?: string
  quantity: number
  unit: string
  rawMaterial?: { id: string; name: string; unit: string; lastPurchasePrice: number }
  subProduct?: { id: string; name: string; calculatedCost?: number }
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

interface CostBreakdown {
  totalCost: number
  ingredients: {
    id: string
    name: string
    type: string
    quantity: number
    unit: string
    unitCost: number
    totalCost: number
  }[]
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const editSchema = z
  .object({
    name: z.string().min(1, "Urun adi zorunludur"),
    code: z.string().optional(),
    categoryId: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    isMenuItem: z.boolean(),
    price: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isMenuItem) return !!data.price && data.price.trim() !== ""
      return true
    },
    { message: "Menu urunleri icin satis fiyati zorunludur", path: ["price"] }
  )

type EditForm = z.infer<typeof editSchema>

const ingredientSchema = z.object({
  type: z.enum(["rawMaterial", "subProduct"]),
  rawMaterialId: z.string().optional(),
  subProductId: z.string().optional(),
  quantity: z.string().min(1, "Miktar zorunludur"),
  unit: z.string().min(1, "Birim zorunludur"),
})

type IngredientForm = z.infer<typeof ingredientSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNIT_DISPLAY: Record<string, string> = {
  KG: "kg",
  GR: "gr",
  LT: "lt",
  ML: "ml",
  ADET: "adet",
}

function getCompatibleUnits(baseUnit: string): string[] {
  if (["KG", "GR"].includes(baseUnit)) return ["KG", "GR"]
  if (["LT", "ML"].includes(baseUnit)) return ["LT", "ML"]
  return ["ADET"]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [addIngredientOpen, setAddIngredientOpen] = useState(false)
  const [deleteIngredientDialog, setDeleteIngredientDialog] = useState<{
    open: boolean
    ingredient: ProductIngredient | null
  }>({ open: false, ingredient: null })

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
  })

  const { data: costData } = useQuery<CostBreakdown>({
    queryKey: ["product-cost", id],
    queryFn: () => api.get(`/products/${id}/cost`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["raw-materials"],
    queryFn: () => api.get("/raw-materials").then((r) => r.data),
  })

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then((r) => r.data),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  })

  const subProducts = allProducts.filter((p) => p.id !== id)

  // ─── Edit Form ──────────────────────────────────────────────────────────

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: product
      ? {
          name: product.name,
          code: product.code || "",
          categoryId: product.categoryId || "",
          description: product.description || "",
          image: product.image || "",
          isMenuItem: product.isMenuItem,
          price: product.price != null ? String(product.price) : "",
        }
      : undefined,
  })

  const isMenuItemEdit = editForm.watch("isMenuItem")

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => {
      const payload: Record<string, unknown> = {
        name: data.name,
        isMenuItem: data.isMenuItem,
      }
      if (data.code !== undefined) payload.code = data.code || null
      if (data.categoryId !== undefined) payload.categoryId = data.categoryId || null
      if (data.description !== undefined) payload.description = data.description || null
      if (data.image !== undefined) payload.image = data.image || null
      if (data.price) payload.price = parseFloat(data.price.replace(",", "."))
      return api.patch(`/products/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      queryClient.invalidateQueries({ queryKey: ["product-cost", id] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Urun bilgileri guncellendi.")
      setIsEditing(false)
    },
    onError: () => toast.error("Guncelleme sirasinda bir hata olustu."),
  })

  // ─── Ingredient Form ────────────────────────────────────────────────────

  const ingredientForm = useForm<IngredientForm>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      type: "rawMaterial",
      rawMaterialId: "",
      subProductId: "",
      quantity: "",
      unit: "",
    },
  })

  const ingredientType = ingredientForm.watch("type")
  const selectedRawMaterialId = ingredientForm.watch("rawMaterialId")
  const selectedSubProductId = ingredientForm.watch("subProductId")

  const selectedRawMaterial = rawMaterials.find((m) => m.id === selectedRawMaterialId)
  const selectedSubProduct = subProducts.find((p) => p.id === selectedSubProductId)

  const compatibleUnits =
    ingredientType === "rawMaterial" && selectedRawMaterial
      ? getCompatibleUnits(selectedRawMaterial.unit)
      : ingredientType === "subProduct"
        ? ["ADET"]
        : []

  const addIngredientMutation = useMutation({
    mutationFn: (data: IngredientForm) => {
      const payload: Record<string, unknown> = {
        quantity: parseFloat(data.quantity.replace(",", ".")),
        unit: data.unit,
      }
      if (data.type === "rawMaterial") {
        payload.rawMaterialId = data.rawMaterialId
      } else {
        payload.subProductId = data.subProductId
      }
      return api.post(`/products/${id}/ingredients`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      queryClient.invalidateQueries({ queryKey: ["product-cost", id] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Malzeme basariyla eklendi.")
      setAddIngredientOpen(false)
      ingredientForm.reset()
    },
    onError: () => toast.error("Malzeme eklenirken bir hata olustu."),
  })

  const removeIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) =>
      api.delete(`/products/${id}/ingredients/${ingredientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      queryClient.invalidateQueries({ queryKey: ["product-cost", id] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Malzeme kaldirildi.")
      setDeleteIngredientDialog({ open: false, ingredient: null })
    },
    onError: () => toast.error("Malzeme kaldirilirken bir hata olustu."),
  })

  // ─── Loading & Not Found ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-on-surface-variant">Urun bulunamadi.</p>
      </div>
    )
  }

  // ─── Computed values ────────────────────────────────────────────────────

  const totalCost = costData?.totalCost ?? product.calculatedCost ?? 0
  const price = product.price || 0
  const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0

  const initials = product.name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()

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
        <span className="text-on-surface font-medium">{product.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xl">
            {initials}
          </div>
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
              {product.name}
            </h2>
            <p className="text-on-surface-variant mt-1">
              {product.code && <span className="font-mono mr-2">{product.code}</span>}
              {product.category?.name ?? "Kategorisiz"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-primary text-on-primary px-6 py-3 rounded-md font-bold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">{isEditing ? "close" : "edit"}</span>
          {isEditing ? "Duzenlemeyi Iptal Et" : "Urunu Duzenle"}
        </button>
      </div>

      {/* Product Info Card */}
      <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)] mb-8">
        {isEditing ? (
          <form
            onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
              <span className="material-symbols-outlined text-primary">edit</span>
              <h3 className="text-lg font-bold text-on-surface">Bilgileri Duzenle</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Urun Adi <span className="text-error">*</span>
                </label>
                <input {...editForm.register("name")} className={inputClass} />
                {editForm.formState.errors.name && (
                  <p className="text-error text-xs mt-1">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">Kod</label>
                <input {...editForm.register("code")} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Kategori
                </label>
                <Controller
                  name="categoryId"
                  control={editForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? "")}
                    >
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Kategori secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Gorsel URL
                </label>
                <input {...editForm.register("image")} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Aciklama
                </label>
                <textarea
                  {...editForm.register("description")}
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <Controller
                  name="isMenuItem"
                  control={editForm.control}
                  render={({ field }) => (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked)}
                      />
                      <div>
                        <span className="text-sm font-semibold text-on-surface">
                          Menude Goster
                        </span>
                        <p className="text-xs text-on-surface-variant">
                          Bu urun menude gorunecek ve satis yapilabilecek.
                        </p>
                      </div>
                    </label>
                  )}
                />
              </div>

              {isMenuItemEdit && (
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Satis Fiyati <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...editForm.register("price")}
                      className={`${inputClass} pr-10`}
                      onChange={(e) => {
                        const cleaned = e.target.value
                          .replace(/[^0-9.,]/g, "")
                          .replace(",", ".")
                        e.target.value = cleaned
                        editForm.register("price").onChange(e)
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">
                      &#8378;
                    </span>
                  </div>
                  {editForm.formState.errors.price && (
                    <p className="text-error text-xs mt-1">
                      {editForm.formState.errors.price.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-6 py-3"
              >
                Iptal
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-primary text-on-primary font-bold rounded-md px-6 py-3 flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">save</span>
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
              <span className="material-symbols-outlined text-primary">inventory_2</span>
              <h3 className="text-lg font-bold text-on-surface">Urun Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <InfoRow label="Ad" value={product.name} />
              <InfoRow label="Kod" value={product.code || "-"} />
              <InfoRow label="Kategori" value={product.category?.name || "-"} />
              <InfoRow
                label="Satis Fiyati"
                value={product.price ? formatCurrencyDecimal(product.price) : "-"}
              />
              <InfoRow
                label="Maliyet"
                value={totalCost > 0 ? formatCurrencyDecimal(totalCost) : "-"}
              />
              <InfoRow
                label="Kar Marji"
                value={price > 0 ? `%${margin.toFixed(1)}` : "-"}
              />
            </div>

            {product.description && (
              <div className="mt-6 pt-4 border-t border-surface-container">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Aciklama
                </p>
                <p className="text-sm text-on-surface">{product.description}</p>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-surface-container">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Satis Fiyati
                </p>
                <p className="text-xl font-bold text-on-surface">
                  {price > 0 ? formatCurrencyDecimal(price) : "-"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Maliyet
                </p>
                <p className="text-xl font-bold text-on-surface">
                  {totalCost > 0 ? formatCurrencyDecimal(totalCost) : "-"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Tip
                </p>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                    product.isMenuItem
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                  )}
                >
                  {product.isMenuItem ? "Menu Urunu" : "Ara Urun"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recipe / Ingredients Section */}
      <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)] mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            <h3 className="text-lg font-bold text-on-surface">Recete / Malzemeler</h3>
          </div>
          <button
            onClick={() => {
              ingredientForm.reset()
              setAddIngredientOpen(true)
            }}
            className="bg-primary text-on-primary px-4 py-2 rounded-md font-bold flex items-center gap-2 text-sm shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Malzeme Ekle
          </button>
        </div>

        {/* Ingredients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Ad
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Tip
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Miktar
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Birim
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Birim Maliyet
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Toplam Maliyet
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Islemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {costData?.ingredients && costData.ingredients.length > 0 ? (
                costData.ingredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-on-surface">{ing.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      {ing.type === "rawMaterial" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed">
                          Stok Kalemi
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
                          Alt Urun
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {ing.quantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {UNIT_DISPLAY[ing.unit] || ing.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {formatCurrencyDecimal(ing.unitCost)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-on-surface">
                      {formatCurrencyDecimal(ing.totalCost)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          const productIngredient = product.ingredients?.find(
                            (pi) => pi.id === ing.id
                          )
                          if (productIngredient) {
                            setDeleteIngredientDialog({
                              open: true,
                              ingredient: productIngredient,
                            })
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : product.ingredients && product.ingredients.length > 0 ? (
                product.ingredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-on-surface">
                        {ing.rawMaterial?.name || ing.subProduct?.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ing.rawMaterialId ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed">
                          Stok Kalemi
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
                          Alt Urun
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {ing.quantity.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {UNIT_DISPLAY[ing.unit] || ing.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">-</td>
                    <td className="px-6 py-4 text-sm font-semibold text-on-surface">-</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          setDeleteIngredientDialog({ open: true, ingredient: ing })
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2 block">
                      science
                    </span>
                    Henuz malzeme eklenmemis. Recete olusturmak icin malzeme ekleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Summary Card */}
      {(totalCost > 0 || price > 0) && (
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
            <span className="material-symbols-outlined text-primary">calculate</span>
            <h3 className="text-lg font-bold text-on-surface">Maliyet Ozeti</h3>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Toplam Maliyet
              </p>
              <p className="text-2xl font-bold text-on-surface">
                {formatCurrencyDecimal(totalCost)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Satis Fiyati
              </p>
              <p className="text-2xl font-bold text-on-surface">
                {price > 0 ? formatCurrencyDecimal(price) : "-"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Kar Marji
              </p>
              {price > 0 ? (
                <span
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 rounded-full text-lg font-bold",
                    margin >= 50
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : margin >= 30
                        ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                        : "bg-error-container text-on-error-container"
                  )}
                >
                  %{margin.toFixed(1)}
                </span>
              ) : (
                <span className="text-2xl font-bold text-on-surface-variant">-</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Ingredient Dialog */}
      <Dialog
        open={addIngredientOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddIngredientOpen(false)
            ingredientForm.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Malzeme Ekle</DialogTitle>
            <DialogDescription>
              Receteye yeni bir stok kalemi veya alt urun ekleyin.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={ingredientForm.handleSubmit((data) =>
              addIngredientMutation.mutate(data)
            )}
            className="space-y-4 mt-2"
          >
            {/* Type Select */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Malzeme Tipi <span className="text-error">*</span>
              </label>
              <Controller
                name="type"
                control={ingredientForm.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      ingredientForm.setValue("rawMaterialId", "")
                      ingredientForm.setValue("subProductId", "")
                      ingredientForm.setValue("unit", "")
                    }}
                  >
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rawMaterial">Stok Kalemi</SelectItem>
                      <SelectItem value="subProduct">Alt Urun</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Material / Product Select */}
            {ingredientType === "rawMaterial" ? (
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Stok Kalemi <span className="text-error">*</span>
                </label>
                <Controller
                  name="rawMaterialId"
                  control={ingredientForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => {
                        field.onChange(v)
                        ingredientForm.setValue("unit", "")
                      }}
                    >
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Stok kalemi secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {rawMaterials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({UNIT_DISPLAY[m.unit] || m.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Alt Urun <span className="text-error">*</span>
                </label>
                <Controller
                  name="subProductId"
                  control={ingredientForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => {
                        field.onChange(v)
                        ingredientForm.setValue("unit", "ADET")
                      }}
                    >
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Alt urun secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {subProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Miktar <span className="text-error">*</span>
                </label>
                <input
                  {...ingredientForm.register("quantity")}
                  placeholder="0"
                  className={inputClass}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    ingredientForm.register("quantity").onChange(e)
                  }}
                />
                {ingredientForm.formState.errors.quantity && (
                  <p className="text-xs text-error mt-1">
                    {ingredientForm.formState.errors.quantity.message}
                  </p>
                )}
              </div>

              {/* Unit */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Birim <span className="text-error">*</span>
                </label>
                <Controller
                  name="unit"
                  control={ingredientForm.control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? "")}
                      disabled={compatibleUnits.length === 0}
                    >
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Birim secin" />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleUnits.map((u) => (
                          <SelectItem key={u} value={u}>
                            {UNIT_DISPLAY[u] || u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {ingredientForm.formState.errors.unit && (
                  <p className="text-xs text-error mt-1">
                    {ingredientForm.formState.errors.unit.message}
                  </p>
                )}
              </div>
            </div>

            {/* Info about selected material */}
            {selectedRawMaterial && (
              <div className="bg-surface-container-low rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Son Alis Fiyati</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrencyDecimal(selectedRawMaterial.lastPurchasePrice)} /{" "}
                    {UNIT_DISPLAY[selectedRawMaterial.unit]}
                  </span>
                </div>
              </div>
            )}

            {selectedSubProduct && selectedSubProduct.calculatedCost != null && (
              <div className="bg-surface-container-low rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Alt Urun Maliyeti</span>
                  <span className="font-semibold text-on-surface">
                    {formatCurrencyDecimal(selectedSubProduct.calculatedCost)}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                Iptal
              </DialogClose>
              <button
                type="submit"
                disabled={addIngredientMutation.isPending}
                className="bg-primary text-on-primary font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
              >
                {addIngredientMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Ingredient Dialog */}
      <Dialog
        open={deleteIngredientDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteIngredientDialog({ open: false, ingredient: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Malzemeyi Kaldir</DialogTitle>
            <DialogDescription>
              Bu malzemeyi receteden kaldirmak istediginize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              Iptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteIngredientDialog.ingredient) {
                  removeIngredientMutation.mutate(deleteIngredientDialog.ingredient.id)
                }
              }}
              disabled={removeIngredientMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {removeIngredientMutation.isPending ? "Kaldiriliyor..." : "Kaldir"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  )
}
