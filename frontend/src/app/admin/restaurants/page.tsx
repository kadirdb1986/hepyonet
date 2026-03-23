"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"
import { DataTable } from "@/components/data-table/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminRestaurant {
  id: string
  name: string
  slug: string
  status: "APPROVED" | "PENDING" | "REJECTED"
  ownerEmail: string
  createdAt: string
  address?: string
  phone?: string
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminRestaurant["status"] }) {
  const config = {
    APPROVED: {
      label: "Onaylı",
      className: "bg-secondary-fixed text-on-secondary-fixed",
    },
    PENDING: {
      label: "Beklemede",
      className: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    },
    REJECTED: {
      label: "Reddedildi",
      className: "bg-error-container text-on-error-container",
    },
  }

  const { label, className } = config[status] || config.PENDING

  return (
    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", className)}>
      {label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRestaurantsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("ALL")

  const { data: restaurants = [], isLoading } = useQuery<AdminRestaurant[]>({
    queryKey: ["admin-restaurants", statusFilter],
    queryFn: () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : ""
      return api.get(`/admin/restaurants${params}`).then((r) => r.data)
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/restaurants/${id}/approve`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      toast.success("Restoran durumu güncellendi")
    },
    onError: () => {
      toast.error("İşlem başarısız")
    },
  })

  const columns: ColumnDef<AdminRestaurant>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Ad",
        cell: ({ row }) => (
          <button
            onClick={() => router.push(`/admin/restaurants/${row.original.id}`)}
            className="text-sm font-semibold text-on-surface hover:text-primary transition-colors text-left"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "ownerEmail",
        header: "Yönetici",
        cell: ({ row }) => (
          <span className="text-sm text-on-surface-variant">{row.original.ownerEmail}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Oluşturma Tarihi",
        cell: ({ row }) => (
          <span className="text-sm text-on-surface-variant">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "İşlemler",
        cell: ({ row }) => {
          const restaurant = row.original
          if (restaurant.status !== "PENDING") return null
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  approveMutation.mutate({ id: restaurant.id, status: "APPROVED" })
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed hover:opacity-80 transition-opacity"
              >
                Onayla
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  approveMutation.mutate({ id: restaurant.id, status: "REJECTED" })
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-error-container text-on-error-container hover:opacity-80 transition-opacity"
              >
                Reddet
              </button>
            </div>
          )
        },
      },
    ],
    [approveMutation, router]
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">
          Restoranlar
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Platformdaki tüm restoranları yönetin
        </p>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={restaurants}
        searchKey="name"
        searchPlaceholder="Restoran ara..."
        toolbar={
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tümü</SelectItem>
              <SelectItem value="APPROVED">Onaylı</SelectItem>
              <SelectItem value="PENDING">Beklemede</SelectItem>
              <SelectItem value="REJECTED">Reddedildi</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  )
}
