"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils"
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Personnel {
  id: string
  name: string
  surname: string
  phone: string | null
  tcNo: string | null
  salary: number
  startDate: string
  isActive: boolean
  position?: {
    id: string
    name: string
  } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonnelListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: "deactivate" | "delete"
    personnel: Personnel | null
  }>({ open: false, type: "deactivate", personnel: null })

  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ["personnel"],
    queryFn: () => api.get("/personnel").then((r) => r.data),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/personnel/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] })
      toast.success("Personel pasife alındı.")
      setConfirmDialog({ open: false, type: "deactivate", personnel: null })
    },
    onError: () => toast.error("İşlem sırasında bir hata oluştu."),
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/personnel/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] })
      toast.success("Personel kalıcı olarak silindi.")
      setConfirmDialog({ open: false, type: "delete", personnel: null })
    },
    onError: () => toast.error("İşlem sırasında bir hata oluştu."),
  })

  const activeCount = personnel.filter((p) => p.isActive).length

  const columns: ColumnDef<Personnel>[] = [
    {
      accessorKey: "name",
      header: "Ad Soyad",
      cell: ({ row }) => {
        const p = row.original
        const initials = `${(p.name ?? "?").charAt(0)}${(p.surname ?? "?").charAt(0)}`.toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-on-surface">
                {p.name} {p.surname}
              </p>
            </div>
          </div>
        )
      },
      filterFn: (row, _columnId, filterValue) => {
        const p = row.original
        const fullName = `${p.name} ${p.surname}`.toLowerCase()
        const phone = p.phone?.toLowerCase() ?? ""
        const position = p.position?.name?.toLowerCase() ?? ""
        const search = filterValue.toLowerCase()
        return fullName.includes(search) || phone.includes(search) || position.includes(search)
      },
    },
    {
      accessorKey: "position",
      header: "Pozisyon",
      cell: ({ row }) => (
        <span className="text-on-surface-variant text-sm">
          {row.original.position?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Telefon",
      cell: ({ row }) => (
        <span className="text-on-surface-variant text-sm">
          {row.original.phone ? formatPhone(row.original.phone) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Başlangıç Tarihi",
      cell: ({ row }) => (
        <span className="text-on-surface-variant text-sm">
          {formatDate(row.original.startDate)}
        </span>
      ),
    },
    {
      accessorKey: "salary",
      header: "Maaş",
      cell: ({ row }) => (
        <span className="font-semibold text-on-surface text-sm">
          {formatCurrency(row.original.salary)}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Durum",
      cell: ({ row }) => {
        const active = row.original.isActive
        return active ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-fixed text-on-secondary-fixed">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            Pasif
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "İşlemler",
      cell: ({ row }) => {
        const p = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">more_vert</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/personnel/${p.id}`)}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Düzenle
              </DropdownMenuItem>
              {p.isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setConfirmDialog({ open: true, type: "deactivate", personnel: p })
                    }
                  >
                    <span className="material-symbols-outlined text-[18px]">person_off</span>
                    Pasife Al
                  </DropdownMenuItem>
                </>
              )}
              {!p.isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setConfirmDialog({ open: true, type: "delete", personnel: p })
                    }
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                    Kalıcı Sil
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
            Personel Yönetimi
          </h2>
          <p className="text-on-surface-variant mt-2 text-lg">
            {isLoading ? "Yükleniyor..." : `${activeCount} aktif çalışan listeleniyor.`}
          </p>
        </div>
        <Link
          href="/dashboard/personnel/new"
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">person_add</span>
          Yeni Personel Ekle
        </Link>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={personnel}
        searchKey="name"
        searchPlaceholder="Ad, pozisyon veya telefon ile ara..."
      />

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, type: "deactivate", personnel: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "deactivate" ? "Personeli Pasife Al" : "Kalıcı Silme"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "deactivate"
                ? `${confirmDialog.personnel?.name} ${confirmDialog.personnel?.surname} adlı personeli pasife almak istediğinize emin misiniz?`
                : `${confirmDialog.personnel?.name} ${confirmDialog.personnel?.surname} adlı personeli kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm"
            >
              İptal
            </DialogClose>
            <button
              onClick={() => {
                if (!confirmDialog.personnel) return
                if (confirmDialog.type === "deactivate") {
                  deactivateMutation.mutate(confirmDialog.personnel.id)
                } else {
                  permanentDeleteMutation.mutate(confirmDialog.personnel.id)
                }
              }}
              disabled={deactivateMutation.isPending || permanentDeleteMutation.isPending}
              className="bg-error text-on-error font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {deactivateMutation.isPending || permanentDeleteMutation.isPending
                ? "İşleniyor..."
                : confirmDialog.type === "deactivate"
                  ? "Pasife Al"
                  : "Kalıcı Sil"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
