"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import api from "@/lib/api"
import { formatCurrency, formatPhone } from "@/lib/utils"
import { DataTable } from "@/components/data-table/data-table"

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
  positionConfig?: {
    id: string
    name: string
  } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonnelListPage() {
  const router = useRouter()

  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ["personnel"],
    queryFn: () => api.get("/personnel").then((r) => r.data),
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
        const position = p.positionConfig?.name?.toLowerCase() ?? ""
        const search = filterValue.toLowerCase()
        return fullName.includes(search) || phone.includes(search) || position.includes(search)
      },
    },
    {
      accessorKey: "position",
      header: "Pozisyon",
      cell: ({ row }) => (
        <span className="text-on-surface-variant text-sm">
          {row.original.positionConfig?.name ?? "—"}
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
      accessorKey: "salary",
      header: "Maaş",
      cell: ({ row }) => (
        <span className="font-semibold text-on-surface text-sm">
          {formatCurrency(row.original.salary)}
        </span>
      ),
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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/personnel/positions"
            className="bg-surface-container-highest text-on-surface px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:translate-y-[-2px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">work</span>
            Pozisyonlar
          </Link>
          <Link
            href="/dashboard/personnel/new"
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">person_add</span>
            Yeni Personel Ekle
          </Link>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={personnel}
        searchKey="name"
        searchPlaceholder="Ad, pozisyon veya telefon ile ara..."
        onRowClick={(p) => router.push(`/dashboard/personnel/${p.id}`)}
      />

    </div>
  )
}
