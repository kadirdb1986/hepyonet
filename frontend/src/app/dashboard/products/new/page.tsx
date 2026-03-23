"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import api from "@/lib/api"
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const productSchema = z
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
      if (data.isMenuItem) {
        return !!data.price && data.price.trim() !== ""
      }
      return true
    },
    { message: "Menu urunleri icin satis fiyati zorunludur", path: ["price"] }
  )

type ProductForm = z.infer<typeof productSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter()

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      code: "",
      categoryId: "",
      description: "",
      image: "",
      isMenuItem: true,
      price: "",
    },
  })

  const isMenuItem = watch("isMenuItem")
  const watchedValues = watch()

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) => {
      const payload: Record<string, unknown> = {
        name: data.name,
        isMenuItem: data.isMenuItem,
      }
      if (data.code) payload.code = data.code
      if (data.categoryId) payload.categoryId = data.categoryId
      if (data.description) payload.description = data.description
      if (data.image) payload.image = data.image
      if (data.price) payload.price = parseFloat(data.price.replace(",", "."))
      return api.post("/products", payload)
    },
    onSuccess: (res) => {
      toast.success("Urun basariyla olusturuldu.")
      router.push(`/dashboard/products/${res.data.id}`)
    },
    onError: () => toast.error("Urun olusturulurken bir hata olustu."),
  })

  const onSubmit = (data: ProductForm) => {
    createMutation.mutate(data)
  }

  const initials = watchedValues.name
    ? watchedValues.name
        .split(" ")
        .map((w) => w.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

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
        <span className="text-on-surface font-medium">Yeni Urun</span>
      </nav>

      {/* Title */}
      <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline mb-8">
        Yeni Urun Olustur
      </h2>

      {/* Grid: Form + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form — 8 cols */}
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-8">
          {/* Section: Temel Bilgiler */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
              <span className="material-symbols-outlined text-primary">inventory_2</span>
              <h3 className="text-lg font-bold text-on-surface">Temel Bilgiler</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Urun Adi <span className="text-error">*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder="Urun adi girin"
                  className={inputClass}
                />
                {errors.name && (
                  <p className="text-error text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">Kod</label>
                <input
                  {...register("code")}
                  placeholder="Urun kodu (opsiyonel)"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Kategori
                </label>
                <Controller
                  name="categoryId"
                  control={control}
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
                <input
                  {...register("image")}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Aciklama
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Urun aciklamasi (opsiyonel)"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: Fiyat & Menu */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
              <span className="material-symbols-outlined text-primary">sell</span>
              <h3 className="text-lg font-bold text-on-surface">Fiyat &amp; Menu</h3>
            </div>

            <div className="space-y-6">
              <Controller
                name="isMenuItem"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    <div>
                      <span className="text-sm font-semibold text-on-surface">Menude Goster</span>
                      <p className="text-xs text-on-surface-variant">
                        Bu urun menude gorunecek ve satis yapilabilecek.
                      </p>
                    </div>
                  </label>
                )}
              />

              {isMenuItem && (
                <div className="max-w-sm">
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Satis Fiyati <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register("price")}
                      placeholder="0"
                      className={`${inputClass} pr-10`}
                      onChange={(e) => {
                        const cleaned = e.target.value
                          .replace(/[^0-9.,]/g, "")
                          .replace(",", ".")
                        e.target.value = cleaned
                        register("price").onChange(e)
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">
                      &#8378;
                    </span>
                  </div>
                  {errors.price && (
                    <p className="text-error text-xs mt-1">{errors.price.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/products"
              className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-6 py-3 transition-all hover:bg-surface-container-high"
            >
              Iptal
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary text-on-primary font-bold rounded-md px-6 py-3 flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">check_circle</span>
              {createMutation.isPending ? "Kaydediliyor..." : "Urunu Olustur"}
            </button>
          </div>
        </form>

        {/* Sidebar — 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Preview Card */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.06)] ring-1 ring-white/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
              Onizleme
            </h4>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-lg">
                {initials}
              </div>
              <div>
                <p className="font-bold text-on-surface">
                  {watchedValues.name || "Urun Adi"}
                </p>
                {watchedValues.code && (
                  <p className="text-xs text-on-surface-variant font-mono">
                    {watchedValues.code}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {watchedValues.categoryId && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Kategori</span>
                  <span className="text-on-surface font-medium">
                    {categories.find((c) => c.id === watchedValues.categoryId)?.name || "-"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tip</span>
                <span className="text-on-surface font-medium">
                  {watchedValues.isMenuItem ? "Menu Urunu" : "Ara Urun"}
                </span>
              </div>
              {watchedValues.price && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Fiyat</span>
                  <span className="text-on-surface font-semibold">
                    {parseFloat(watchedValues.price.replace(",", ".")).toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-primary-fixed/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-xl">info</span>
              <h4 className="text-sm font-bold text-on-surface">Bilgi</h4>
            </div>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">
                  check
                </span>
                Urun adi zorunludur.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">
                  check
                </span>
                Menu urunleri icin satis fiyati belirtilmelidir.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">
                  check
                </span>
                Urunu olusturduktan sonra recete ekleyebilirsiniz.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">
                  check
                </span>
                Kategorileri &quot;Kategoriler&quot; sayfasindan yonetebilirsiniz.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
