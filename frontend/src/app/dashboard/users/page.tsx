"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  userId: string
  email: string
  name: string
  role: string
  isActive: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Yönetici" },
  { value: "ACCOUNTANT", label: "Muhasebe" },
  { value: "HR", label: "İnsan Kaynakları" },
  { value: "STOCK_MANAGER", label: "Depocu" },
  { value: "MENU_MANAGER", label: "Menü Yöneticisi" },
  { value: "WAITER", label: "Garson" },
]

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Sahip",
  ADMIN: "Yönetici",
  ACCOUNTANT: "Muhasebe",
  HR: "İnsan Kaynakları",
  STOCK_MANAGER: "Depocu",
  MENU_MANAGER: "Menü Yöneticisi",
  WAITER: "Garson",
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  role: z.string().min(1, "Rol seçin"),
})

type AddMemberForm = z.infer<typeof addMemberSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [selectedRole, setSelectedRole] = useState("ACCOUNTANT")

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["restaurant-members"],
    queryFn: () => api.get("/restaurants/current/members").then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "ACCOUNTANT" },
  })

  const addMemberMutation = useMutation({
    mutationFn: (data: AddMemberForm) =>
      api.post("/restaurants/current/members", { email: data.email, role: data.role }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-members"] })
      toast.success("Üye başarıyla eklendi")
      setAddDialogOpen(false)
      reset()
      setSelectedRole("ACCOUNTANT")
    },
    onError: () => {
      toast.error("Üye eklenemedi")
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/restaurants/current/members/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-members"] })
      toast.success("Rol güncellendi")
    },
    onError: () => {
      toast.error("Rol güncellenemedi")
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/restaurants/current/members/${userId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-members"] })
      toast.success("Üye kaldırıldı")
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error("Üye kaldırılamadı")
    },
  })

  const onAddMember = (data: AddMemberForm) => {
    addMemberMutation.mutate({ ...data, role: selectedRole })
  }

  const columns: ColumnDef<Member>[] = useMemo(
    () => [
      {
        accessorKey: "email",
        header: "E-posta",
        cell: ({ row }) => (
          <span className="text-sm font-medium text-on-surface">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Ad",
        cell: ({ row }) => (
          <span className="text-sm text-on-surface">{row.original.name || "—"}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Rol",
        cell: ({ row }) => {
          const member = row.original
          if (member.role === "OWNER") {
            return (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed">
                Sahip
              </span>
            )
          }
          return (
            <Select
              value={member.role}
              onValueChange={(val) => {
                if (val) updateRoleMutation.mutate({ userId: member.userId, role: val })
              }}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue>
                  {(value: string | null) =>
                    value ? ROLE_LABELS[value] ?? value : ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
      },
      {
        accessorKey: "isActive",
        header: "Durum",
        cell: ({ row }) => {
          const active = row.original.isActive
          return (
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full",
                active
                  ? "bg-secondary-fixed text-on-secondary-fixed"
                  : "bg-error-container text-on-error-container"
              )}
            >
              {active ? "Aktif" : "Pasif"}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "İşlemler",
        cell: ({ row }) => {
          const member = row.original
          if (member.role === "OWNER") return null
          return (
            <button
              onClick={() => setDeleteTarget(member)}
              className="text-xs font-semibold text-error hover:text-on-error-container hover:bg-error-container px-3 py-1.5 rounded-lg transition-colors"
            >
              Kaldır
            </button>
          )
        },
      },
    ],
    [updateRoleMutation]
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">
          Kullanıcı Yönetimi
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Restoran üyelerini yönetin
        </p>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={members}
        searchKey="email"
        searchPlaceholder="E-posta ile ara..."
        toolbar={
          <button
            onClick={() => setAddDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold text-sm rounded-xl hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Üye Ekle
          </button>
        }
      />

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Üye Ekle</DialogTitle>
            <DialogDescription>
              Restorana yeni bir üye davet edin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddMember)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface-variant">
                E-posta
              </label>
              <input
                {...register("email")}
                className="w-full px-4 py-3 bg-surface-container-low focus:bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-surface-tint/20 transition-all placeholder:text-outline/60 text-on-surface outline-none"
                placeholder="kullanici@email.com"
                type="email"
              />
              {errors.email && (
                <p className="text-xs text-error">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface-variant">
                Rol
              </label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val ?? "ACCOUNTANT")}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? ROLE_LABELS[value] ?? value : ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <DialogClose
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              >
                İptal
              </DialogClose>
              <button
                type="submit"
                disabled={addMemberMutation.isPending}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {addMemberMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Üyeyi Kaldır</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong> adlı üyeyi kaldırmak
              istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
            >
              İptal
            </DialogClose>
            <button
              onClick={() => deleteTarget && removeMemberMutation.mutate(deleteTarget.userId)}
              disabled={removeMemberMutation.isPending}
              className="px-4 py-2 bg-error text-on-error font-bold text-sm rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {removeMemberMutation.isPending ? "Kaldırılıyor..." : "Kaldır"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
