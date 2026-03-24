"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, subMonths, addMonths } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Leave {
  id: string
  startDate: string
  endDate: string
  type: "ANNUAL" | "SICK" | "OTHER"
  status: "PENDING" | "APPROVED" | "REJECTED"
  notes: string | null
}

interface PersonnelDetail {
  id: string
  name: string
  surname: string
  phone: string | null
  tcNo: string | null
  salary: number
  startDate: string
  isActive: boolean
  positionConfig?: { id: string; name: string } | null
  leaveRecords?: Leave[]
}

interface PositionConfig {
  id: string
  name: string
}

interface WorkDays {
  totalDaysInMonth: number
  weekends: number
  businessDays: number
  workDays: number
  leaveDays: number
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  surname: z.string().min(1, "Soyad zorunludur"),
  phone: z.string().optional(),
  tcNo: z.string().optional(),
  positionId: z.string().optional(),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur"),
  salary: z.string().min(1, "Maaş zorunludur"),
})

type EditForm = z.infer<typeof editSchema>

const leaveSchema = z.object({
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur"),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur"),
  type: z.enum(["ANNUAL", "SICK", "OTHER"]),
  notes: z.string().optional(),
})

type LeaveForm = z.infer<typeof leaveSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const leaveTypeBadge = (type: Leave["type"]) => {
  switch (type) {
    case "ANNUAL":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
          Yıllık İzin
        </span>
      )
    case "SICK":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-error-container text-on-error-container">
          Hastalık
        </span>
      )
    case "OTHER":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed-variant">
          Diğer
        </span>
      )
  }
}

const leaveStatusDisplay = (status: Leave["status"]) => {
  switch (status) {
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-secondary font-medium">Onaylandı</span>
        </span>
      )
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />
          <span className="text-on-tertiary-container font-medium">Beklemede</span>
        </span>
      )
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-error" />
          <span className="text-error font-medium">Reddedildi</span>
        </span>
      )
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonnelDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: personnel, isLoading } = useQuery<PersonnelDetail>({
    queryKey: ["personnel", id],
    queryFn: () => api.get(`/personnel/${id}`).then((r) => r.data),
  })

  const { data: positions = [] } = useQuery<PositionConfig[]>({
    queryKey: ["position-configs"],
    queryFn: () => api.get("/position-configs").then((r) => r.data),
  })

  const { data: workDays } = useQuery<WorkDays>({
    queryKey: ["work-days", id, selectedMonth],
    queryFn: () =>
      api.get(`/personnel/${id}/work-days?month=${selectedMonth}`).then((r) => r.data),
    enabled: !!id,
  })

  // ─── Edit Form ────────────────────────────────────────────────────────────

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: personnel
      ? {
          name: personnel.name,
          surname: personnel.surname,
          phone: personnel.phone ? String(personnel.phone).replace("+90", "") : "",
          tcNo: personnel.tcNo ?? "",
          positionId: personnel.positionConfig?.id ?? "",
          startDate: personnel.startDate ? personnel.startDate.slice(0, 10) : "",
          salary: String(personnel.salary),
        }
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => {
      const payload = {
        name: data.name,
        surname: data.surname,
        phone: data.phone ? data.phone.replace(/\D/g, "") : undefined,
        tcNo: data.tcNo || undefined,
        positionId: data.positionId || undefined,
        startDate: new Date(data.startDate).toISOString(),
        salary: parseFloat(data.salary.replace(",", ".")),
      }
      return api.patch(`/personnel/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel", id] })
      toast.success("Personel bilgileri güncellendi.")
      setIsEditing(false)
    },
    onError: () => toast.error("Güncelleme sırasında bir hata oluştu."),
  })

  // ─── Leave Form ───────────────────────────────────────────────────────────

  const leaveForm = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { startDate: "", endDate: "", type: "ANNUAL", notes: "" },
  })

  const createLeaveMutation = useMutation({
    mutationFn: (data: LeaveForm) =>
      api.post(`/personnel/${id}/leaves`, {
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        type: data.type,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel", id] })
      queryClient.invalidateQueries({ queryKey: ["work-days", id] })
      toast.success("İzin kaydı oluşturuldu.")
      setLeaveDialogOpen(false)
      leaveForm.reset()
    },
    onError: () => toast.error("İzin kaydı oluşturulurken bir hata oluştu."),
  })

  const updateLeaveMutation = useMutation({
    mutationFn: ({ leaveId, status }: { leaveId: string; status: string }) =>
      api.patch(`/personnel/${id}/leaves/${leaveId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel", id] })
      queryClient.invalidateQueries({ queryKey: ["work-days", id] })
      toast.success("İzin durumu güncellendi.")
    },
    onError: () => toast.error("İzin durumu güncellenirken bir hata oluştu."),
  })

  // ─── Month Navigation ────────────────────────────────────────────────────

  const goToPrevMonth = () => {
    const d = new Date(selectedMonth + "-01")
    setSelectedMonth(format(subMonths(d, 1), "yyyy-MM"))
  }

  const goToNextMonth = () => {
    const d = new Date(selectedMonth + "-01")
    setSelectedMonth(format(addMonths(d, 1), "yyyy-MM"))
  }

  const monthLabel = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: tr })

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!personnel) {
    return (
      <div className="text-center py-20">
        <p className="text-on-surface-variant">Personel bulunamadı.</p>
      </div>
    )
  }

  const initials = `${(personnel.name ?? "?").charAt(0)}${(personnel.surname ?? "?").charAt(0)}`.toUpperCase()
  const workedPercent =
    workDays && (workDays.businessDays ?? 0) > 0
      ? Math.round(((workDays.workDays ?? 0) / workDays.businessDays) * 100)
      : 0

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
        <span className="text-on-surface font-medium">Profil Detayı</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xl">
            {initials}
          </div>
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
              {personnel.name} {personnel.surname}
            </h2>
            <p className="text-on-surface-variant mt-1">
              {personnel.positionConfig?.name ?? "Pozisyon belirtilmedi"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">{isEditing ? "close" : "edit"}</span>
          {isEditing ? "Düzenlemeyi İptal Et" : "Profili Düzenle"}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Personnel Info Card — 2/3 */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
          {isEditing ? (
            <form
              onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
                <span className="material-symbols-outlined text-primary">edit</span>
                <h3 className="text-lg font-bold text-on-surface">Bilgileri Düzenle</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Ad <span className="text-error">*</span>
                  </label>
                  <input {...editForm.register("name")} className={inputClass} />
                  {editForm.formState.errors.name && (
                    <p className="text-error text-xs mt-1">
                      {editForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Soyad <span className="text-error">*</span>
                  </label>
                  <input {...editForm.register("surname")} className={inputClass} />
                  {editForm.formState.errors.surname && (
                    <p className="text-error text-xs mt-1">
                      {editForm.formState.errors.surname.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Telefon
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 py-3 bg-surface-container-high rounded-l-lg text-on-surface-variant text-sm font-medium border-r border-surface-container">
                      +90
                    </span>
                    <input
                      {...editForm.register("phone")}
                      className={`${inputClass} rounded-l-none`}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    TC Kimlik No
                  </label>
                  <input
                    {...editForm.register("tcNo")}
                    maxLength={11}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Pozisyon
                  </label>
                  <select {...editForm.register("positionId")} className={inputClass}>
                    <option value="">Pozisyon seçin</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Başlangıç Tarihi <span className="text-error">*</span>
                  </label>
                  <input
                    {...editForm.register("startDate")}
                    type="date"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                    Maaş <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...editForm.register("salary")}
                      className={`${inputClass} pr-10`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">
                      ₺
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-6 py-3"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-primary text-on-primary font-bold rounded-xl px-6 py-3 flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">save</span>
                  {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
                <span className="material-symbols-outlined text-primary">person</span>
                <h3 className="text-lg font-bold text-on-surface">Personel Bilgileri</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                <InfoRow label="Pozisyon" value={personnel.positionConfig?.name ?? "—"} />
                <InfoRow label="Telefon" value={personnel.phone ? formatPhone(personnel.phone) : "—"} />
                <InfoRow label="İşe Giriş" value={formatDate(personnel.startDate)} />
                <InfoRow label="TC Kimlik" value={personnel.tcNo ?? "—"} />
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-surface-container">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Maaş
                  </p>
                  <p className="text-xl font-bold text-on-surface">
                    {formatCurrency(personnel.salary)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Kalan İzin
                  </p>
                  <p className="text-xl font-bold text-on-surface">
                    {workDays ? workDays.leaveDays ?? 0 : "—"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Durum
                  </p>
                  {personnel.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-fixed text-on-secondary-fixed">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      Pasif
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Work Days Card — 1/3 */}
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <h3 className="text-lg font-bold text-on-surface">Çalışma Günleri</h3>
          </div>

          {/* Month Selector */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
            </button>
            <span className="text-sm font-semibold text-on-surface capitalize">{monthLabel}</span>
            <button
              onClick={goToNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          </div>

          {/* Stats Grid */}
          {workDays ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatBox label="Toplam Gün" value={workDays.totalDaysInMonth} />
              <StatBox label="Hafta Sonu" value={workDays.weekends} />
              <StatBox
                label="Çalışılan"
                value={workDays.workDays}
                borderColor="border-l-secondary"
              />
              <StatBox
                label="İzinli"
                value={workDays.leaveDays}
                borderColor="border-l-tertiary"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-surface-container-low rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Progress Bar */}
          {workDays && (
            <div>
              <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                <span>Devam Oranı</span>
                <span className="font-semibold text-on-surface">%{workedPercent}</span>
              </div>
              <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${workedPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leave Records */}
      <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">event_available</span>
            <h3 className="text-lg font-bold text-on-surface">İzin Kayıtları</h3>
          </div>
          <button
            onClick={() => setLeaveDialogOpen(true)}
            className="bg-primary text-on-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg hover:translate-y-[-1px] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            İzin Ekle
          </button>
        </div>

        {/* Leave Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Başlangıç
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Bitiş
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  İzin Tipi
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Durum
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Notlar
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {(personnel.leaveRecords ?? []).length > 0 ? (
                (personnel.leaveRecords ?? []).map((leave) => (
                  <tr key={leave.id} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {formatDate(leave.startDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {formatDate(leave.endDate)}
                    </td>
                    <td className="px-6 py-4">{leaveTypeBadge(leave.type)}</td>
                    <td className="px-6 py-4">{leaveStatusDisplay(leave.status)}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant max-w-[200px] truncate">
                      {leave.notes ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {leave.status === "PENDING" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors">
                            <span className="material-symbols-outlined text-on-surface-variant text-xl">
                              more_vert
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem
                              onClick={() =>
                                updateLeaveMutation.mutate({
                                  leaveId: leave.id,
                                  status: "APPROVED",
                                })
                              }
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                check_circle
                              </span>
                              Onayla
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                updateLeaveMutation.mutate({
                                  leaveId: leave.id,
                                  status: "REJECTED",
                                })
                              }
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                              Reddet
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2 block">
                      beach_access
                    </span>
                    Henüz izin kaydı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Leave Dialog */}
      <Dialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveDialogOpen(false)
            leaveForm.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>İzin Ekle</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={leaveForm.handleSubmit((data) => createLeaveMutation.mutate(data))}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Başlangıç Tarihi <span className="text-error">*</span>
              </label>
              <input
                {...leaveForm.register("startDate")}
                type="date"
                className={inputClass}
              />
              {leaveForm.formState.errors.startDate && (
                <p className="text-error text-xs mt-1">
                  {leaveForm.formState.errors.startDate.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                Bitiş Tarihi <span className="text-error">*</span>
              </label>
              <input
                {...leaveForm.register("endDate")}
                type="date"
                className={inputClass}
              />
              {leaveForm.formState.errors.endDate && (
                <p className="text-error text-xs mt-1">
                  {leaveForm.formState.errors.endDate.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                İzin Tipi <span className="text-error">*</span>
              </label>
              <select {...leaveForm.register("type")} className={inputClass}>
                <option value="ANNUAL">Yıllık İzin</option>
                <option value="SICK">Hastalık</option>
                <option value="OTHER">Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-on-surface mb-1.5 block">Notlar</label>
              <textarea
                {...leaveForm.register("notes")}
                rows={3}
                placeholder="Opsiyonel not..."
                className={inputClass}
              />
            </div>
            <DialogFooter>
              <DialogClose className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-4 py-2 text-sm">
                İptal
              </DialogClose>
              <button
                type="submit"
                disabled={createLeaveMutation.isPending}
                className="bg-primary text-on-primary font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {createLeaveMutation.isPending ? "Kaydediliyor..." : "İzin Ekle"}
              </button>
            </DialogFooter>
          </form>
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

function StatBox({
  label,
  value,
  borderColor,
}: {
  label: string
  value: number
  borderColor?: string
}) {
  return (
    <div
      className={`bg-surface-container-low rounded-lg p-4 ${borderColor ? `border-l-4 ${borderColor}` : ""}`}
    >
      <p className="text-xs text-on-surface-variant mb-1">{label}</p>
      <p className="text-xl font-bold text-on-surface">{value}</p>
    </div>
  )
}
