"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

interface PositionConfig {
  id: string
  name: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PositionsPage() {
  const queryClient = useQueryClient()
  const [newPositionName, setNewPositionName] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    position: PositionConfig | null
  }>({ open: false, position: null })

  const { data: positions = [] } = useQuery<PositionConfig[]>({
    queryKey: ["position-configs"],
    queryFn: () => api.get("/position-configs").then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/position-configs", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-configs"] })
      toast.success("Pozisyon başarıyla eklendi.")
      setNewPositionName("")
    },
    onError: () => toast.error("Pozisyon eklenirken bir hata oluştu."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/position-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-configs"] })
      toast.success("Pozisyon silindi.")
      setDeleteDialog({ open: false, position: null })
    },
    onError: () => toast.error("Pozisyon silinirken bir hata oluştu."),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newPositionName.trim()
    if (!trimmed) return
    createMutation.mutate(trimmed)
  }

  const columns: ColumnDef<PositionConfig>[] = [
    {
      accessorKey: "name",
      header: "Pozisyon Adı",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-fixed text-lg">badge</span>
          </div>
          <span className="font-semibold text-on-surface">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: ({ row }) => (
        <button
          onClick={() => setDeleteDialog({ open: true, position: row.original })}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error"
        >
          <span className="material-symbols-outlined text-xl">delete</span>
        </button>
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
        <Link href="/dashboard/personnel" className="hover:text-on-surface transition-colors">
          Personel
        </Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface font-medium">Pozisyonlar</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Pozisyon Yönetimi
          </h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            {positions.length} pozisyon tanımlı.
          </p>
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.06)] mb-8">
        <form onSubmit={handleCreate} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-on-surface mb-1.5 block">
              Yeni Pozisyon Adı
            </label>
            <input
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              placeholder="Örn: Garson, Aşçı, Kasiyer..."
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={!newPositionName.trim() || createMutation.isPending}
            className="bg-primary text-on-primary px-6 py-3 rounded-md font-bold flex items-center gap-2 shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={positions}
        searchKey="name"
        searchPlaceholder="Pozisyon ara..."
      />

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, position: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pozisyonu Sil</DialogTitle>
            <DialogDescription>
              &quot;{deleteDialog.position?.name}&quot; pozisyonunu silmek istediğinize emin
              misiniz? Bu pozisyona atanmış personeller etkilenebilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
              İptal
            </DialogClose>
            <button
              onClick={() => {
                if (deleteDialog.position) {
                  deleteMutation.mutate(deleteDialog.position.id)
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
