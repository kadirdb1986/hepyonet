"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrencyDecimal, cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  productId: string
  displayOrder: number
  isAvailable: boolean
  product: {
    id: string
    name: string
    code?: string
    description?: string
    image?: string
    price?: number
    category?: {
      id: string
      name: string
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<MenuItem[]>([])
  const [hasOrderChanged, setHasOrderChanged] = useState(false)

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: () => api.get("/menu").then((r) => r.data),
  })

  // Sync local state when data loads (only if no pending reorder)
  const currentItems = hasOrderChanged ? items : menuItems

  // ─── Mutations ────────────────────────────────────────────────────────

  const orderMutation = useMutation({
    mutationFn: (orderedItems: { menuItemId: string; displayOrder: number }[]) =>
      api.patch("/menu/order", { items: orderedItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] })
      toast.success("Sıralama kaydedildi.")
      setHasOrderChanged(false)
    },
    onError: () => toast.error("Sıralama kaydedilirken bir hata oluştu."),
  })

  const availabilityMutation = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      api.patch(`/menu/${productId}/availability`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] })
      toast.success("Durum güncellendi.")
    },
    onError: () => toast.error("Durum güncellenirken bir hata oluştu."),
  })

  // ─── Reorder ──────────────────────────────────────────────────────────

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const list = [...(hasOrderChanged ? items : menuItems)]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= list.length) return

      const temp = list[index]
      list[index] = list[targetIndex]
      list[targetIndex] = temp

      setItems(list)
      setHasOrderChanged(true)
    },
    [hasOrderChanged, items, menuItems]
  )

  const saveOrder = () => {
    const orderedItems = (hasOrderChanged ? items : menuItems).map((item, i) => ({
      menuItemId: item.id,
      displayOrder: i + 1,
    }))
    orderMutation.mutate(orderedItems)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  function ProductAvatar({ name, image }: { name: string; image?: string }) {
    if (image) {
      return (
        <Image
          src={image}
          alt={name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover"
        />
      )
    }
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

  // ─── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
              Menu Yonetimi
            </h1>
            <p className="text-on-surface-variant mt-2 text-lg">Yukleniyor...</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Menu Yonetimi
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {currentItems.length} urun menude listeleniyor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/menu/qr"
            className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">qr_code_2</span>
            QR Menu
          </Link>
          {hasOrderChanged && (
            <button
              onClick={saveOrder}
              disabled={orderMutation.isPending}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">save</span>
              {orderMutation.isPending ? "Kaydediliyor..." : "Siralamayi Kaydet"}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {currentItems.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] p-16 flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
            restaurant_menu
          </span>
          <p className="text-on-surface-variant text-lg font-medium">
            Henuz menude urun yok
          </p>
          <Link
            href="/dashboard/products"
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all mt-2"
          >
            <span className="material-symbols-outlined text-xl">inventory</span>
            Urunlere Git
          </Link>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant w-16">
                    #
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Urun
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Kod
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">
                    Fiyat
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-center w-24">
                    Sirala
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {currentItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-surface-bright transition-colors group",
                      !item.isAvailable && "opacity-60"
                    )}
                  >
                    {/* Order Number */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-on-surface-variant">
                        {index + 1}
                      </span>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <ProductAvatar
                          name={item.product.name}
                          image={item.product.image}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate max-w-xs">
                            {item.product.name}
                          </p>
                          {item.product.description && (
                            <p className="text-xs text-on-surface-variant truncate max-w-xs mt-0.5">
                              {item.product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-6 py-4">
                      {item.product.code ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant font-mono">
                          {item.product.code}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/50">-</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      {item.product.category ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          {item.product.category.name}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/50">-</span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-on-surface">
                        {item.product.price
                          ? formatCurrencyDecimal(item.product.price)
                          : "-"}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={(checked: boolean) =>
                            availabilityMutation.mutate({
                              productId: item.product.id,
                              isAvailable: checked,
                            })
                          }
                        />
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            item.isAvailable
                              ? "text-primary"
                              : "text-on-surface-variant"
                          )}
                        >
                          {item.isAvailable ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                    </td>

                    {/* Reorder */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => moveItem(index, "up")}
                          disabled={index === 0}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-lg">
                            arrow_upward
                          </span>
                        </button>
                        <button
                          onClick={() => moveItem(index, "down")}
                          disabled={index === currentItems.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-lg">
                            arrow_downward
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
