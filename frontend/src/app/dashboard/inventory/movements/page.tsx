"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { ColumnDef } from "@tanstack/react-table"
import api from "@/lib/api"
import { formatCurrencyDecimal, formatDate } from "@/lib/utils"
import { DataTable } from "@/components/data-table/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface StockMovement {
  id: string
  rawMaterialId: string
  rawMaterial?: {
    id: string
    name: string
    unit: string
  }
  quantity: number
  unitPrice: number
  type: "IN" | "OUT"
  supplier?: string
  invoiceNo?: string
  date: string
}

interface RawMaterial {
  id: string
  name: string
  unit: string
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const movementSchema = z.object({
  rawMaterialId: z.string().min(1, "Malzeme zorunludur"),
  type: z.string().min(1, "Hareket tipi zorunludur"),
  quantity: z.string().min(1, "Miktar zorunludur"),
  unitPrice: z.string().min(1, "Birim fiyat zorunludur"),
  supplier: z.string().optional(),
  invoiceNo: z.string().optional(),
  date: z.string().min(1, "Tarih zorunludur"),
})

type MovementForm = z.infer<typeof movementSchema>

const UNIT_DISPLAY: Record<string, string> = {
  KG: "kg",
  GR: "gr",
  LT: "lt",
  ML: "ml",
  ADET: "adet",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockMovementsPage() {
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // ─── Data ─────────────────────────────────────────────────────────────

  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ["stock-movements"],
    queryFn: () => api.get("/stock-movements").then((r) => r.data),
  })

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["raw-materials"],
    queryFn: () => api.get("/raw-materials").then((r) => r.data),
  })

  // Build material lookup map
  const materialMap = useMemo(() => {
    const map: Record<string, RawMaterial> = {}
    rawMaterials.forEach((m) => {
      map[m.id] = m
    })
    return map
  }, [rawMaterials])

  // ─── Mutations ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/stock-movements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] })
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] })
      queryClient.invalidateQueries({ queryKey: ["raw-materials-low-stock"] })
      toast.success("Stok hareketi basariyla eklendi.")
      setAddDialogOpen(false)
    },
    onError: () => toast.error("Stok hareketi eklenirken bir hata olustu."),
  })

  // ─── Form Dialog ──────────────────────────────────────────────────────

  function MovementFormDialog({
    open,
    onOpenChange,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
  }) {
    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
    } = useForm<MovementForm>({
      resolver: zodResolver(movementSchema),
      defaultValues: {
        rawMaterialId: "",
        type: "",
        quantity: "",
        unitPrice: "",
        supplier: "",
        invoiceNo: "",
        date: format(new Date(), "yyyy-MM-dd"),
      },
    })

    const handleAdd = (data: MovementForm) => {
      const payload: Record<string, unknown> = {
        rawMaterialId: data.rawMaterialId,
        type: data.type,
        quantity: parseFloat(data.quantity.replace(",", ".")),
        unitPrice: parseFloat(data.unitPrice.replace(",", ".")),
        date: new Date(data.date).toISOString(),
      }
      if (data.supplier) payload.supplier = data.supplier
      if (data.invoiceNo) payload.invoiceNo = data.invoiceNo
      createMutation.mutate(payload)
    }

    const inputClass =
      "w-full px-4 py-3 bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/10 focus:bg-surface-container-lowest rounded-lg transition-all text-on-surface outline-none"

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Stok Hareketi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAdd)} className="space-y-4">
            {/* Raw Material */}
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Malzeme
              </label>
              <Controller
                name="rawMaterialId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                      <SelectValue placeholder="Malzeme secin" />
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
              {errors.rawMaterialId && (
                <p className="text-xs text-error mt-1">{errors.rawMaterialId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Hareket Tipi
                </label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                      <SelectTrigger className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-lg">
                        <SelectValue placeholder="Tip secin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Giris</SelectItem>
                        <SelectItem value="OUT">Cikis</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-xs text-error mt-1">{errors.type.message}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Tarih
                </label>
                <input
                  type="date"
                  {...register("date")}
                  className={inputClass}
                />
                {errors.date && (
                  <p className="text-xs text-error mt-1">{errors.date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Miktar
                </label>
                <input
                  {...register("quantity")}
                  className={inputClass}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    register("quantity").onChange(e)
                  }}
                />
                {errors.quantity && (
                  <p className="text-xs text-error mt-1">{errors.quantity.message}</p>
                )}
              </div>

              {/* Unit Price */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Birim Fiyat (TL)
                </label>
                <input
                  {...register("unitPrice")}
                  className={inputClass}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    e.target.value = cleaned
                    register("unitPrice").onChange(e)
                  }}
                />
                {errors.unitPrice && (
                  <p className="text-xs text-error mt-1">{errors.unitPrice.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Supplier */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Tedarikci
                </label>
                <input
                  {...register("supplier")}
                  className={inputClass}
                  placeholder="Tedarikci adi"
                />
              </div>

              {/* Invoice No */}
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Fatura No
                </label>
                <input
                  {...register("invoiceNo")}
                  className={inputClass}
                  placeholder="Fatura numarasi"
                />
              </div>
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
                {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Table columns ───────────────────────────────────────────────────

  const columns: ColumnDef<StockMovement>[] = [
    {
      accessorKey: "date",
      header: "Tarih",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-on-surface">
          {formatDate(row.original.date)}
        </span>
      ),
    },
    {
      id: "materialName",
      header: "Malzeme Adi",
      accessorFn: (row) => row.rawMaterial?.name || materialMap[row.rawMaterialId]?.name || "",
      cell: ({ row }) => {
        const name =
          row.original.rawMaterial?.name ||
          materialMap[row.original.rawMaterialId]?.name ||
          "-"
        return <span className="font-semibold text-on-surface">{name}</span>
      },
    },
    {
      accessorKey: "type",
      header: "Hareket Tipi",
      cell: ({ row }) => {
        const isIn = row.original.type === "IN"
        return (
          <span
            className={`inline-flex h-6 items-center px-2.5 rounded-full text-xs font-semibold ${
              isIn
                ? "bg-secondary-fixed text-on-secondary-fixed"
                : "bg-error-container text-on-error-container"
            }`}
          >
            {isIn ? "Giris" : "Cikis"}
          </span>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: "Miktar",
      cell: ({ row }) => {
        const unit =
          row.original.rawMaterial?.unit ||
          materialMap[row.original.rawMaterialId]?.unit ||
          ""
        return (
          <span className="text-sm font-semibold text-on-surface">
            {row.original.quantity.toLocaleString("tr-TR")}{" "}
            {UNIT_DISPLAY[unit] || unit}
          </span>
        )
      },
    },
    {
      accessorKey: "unitPrice",
      header: "Birim Fiyat",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {formatCurrencyDecimal(row.original.unitPrice)}
        </span>
      ),
    },
    {
      id: "totalAmount",
      header: "Toplam Tutar",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-on-surface">
          {formatCurrencyDecimal(row.original.quantity * row.original.unitPrice)}
        </span>
      ),
    },
    {
      accessorKey: "supplier",
      header: "Tedarikci",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface">
          {row.original.supplier || "-"}
        </span>
      ),
    },
    {
      accessorKey: "invoiceNo",
      header: "Fatura No",
      cell: ({ row }) => (
        <span className="text-sm text-on-surface-variant">
          {row.original.invoiceNo || "-"}
        </span>
      ),
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
        <span className="text-on-surface font-medium">Stok Hareketleri</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Stok Hareketleri
          </h1>
          <p className="text-on-surface-variant mt-2 text-lg">
            {movements.length} hareket kaydedilmis.
          </p>
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Hareket Ekle
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={movements}
        searchKey="materialName"
        searchPlaceholder="Malzeme, tedarikci veya fatura no ara..."
      />

      {/* Add Movement Dialog */}
      <MovementFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  )
}
