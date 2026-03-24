"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import api from "@/lib/api"
import { formatCurrency, formatPhoneInput } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionConfig {
  id: string
  name: string
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const personnelSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  surname: z.string().min(1, "Soyad zorunludur"),
  phone: z.string().optional(),
  tcNo: z.string().optional(),
  positionId: z.string().optional(),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur"),
  salary: z.string().min(1, "Maaş zorunludur"),
})

type PersonnelForm = z.infer<typeof personnelSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPersonnelPage() {
  const router = useRouter()
  const [phonePrefix] = useState("+90")

  const { data: positions = [] } = useQuery<PositionConfig[]>({
    queryKey: ["position-configs"],
    queryFn: () => api.get("/position-configs").then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<PersonnelForm>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      name: "",
      surname: "",
      phone: "",
      tcNo: "",
      positionId: "",
      startDate: "",
      salary: "",
    },
  })

  const watchedValues = watch()

  const createMutation = useMutation({
    mutationFn: (data: PersonnelForm) => {
      const payload = {
        name: data.name,
        surname: data.surname,
        phone: data.phone ? data.phone.replace(/\D/g, "") : undefined,
        tcNo: data.tcNo || undefined,
        positionId: data.positionId || undefined,
        startDate: new Date(data.startDate).toISOString(),
        salary: parseFloat(data.salary.replace(",", ".")),
      }
      return api.post("/personnel", payload)
    },
    onSuccess: () => {
      toast.success("Personel kaydı başarıyla oluşturuldu.")
      router.push("/dashboard/personnel")
    },
    onError: () => toast.error("Personel kaydı oluşturulurken bir hata oluştu."),
  })

  const onSubmit = (data: PersonnelForm) => {
    createMutation.mutate(data)
  }

  const selectedPosition = positions.find((p) => p.id === watchedValues.positionId)
  const salaryNum = parseFloat((watchedValues.salary || "0").replace(",", "."))

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
        <span className="text-on-surface font-medium">Yeni Kayıt</span>
      </nav>

      {/* Title */}
      <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline mb-8">
        Yeni Personel Kaydı
      </h2>

      {/* Grid: Form + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form — 8 cols */}
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-8">
          {/* Section: Kişisel Bilgiler */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
              <span className="material-symbols-outlined text-primary">person_add</span>
              <h3 className="text-lg font-bold text-on-surface">Kişisel Bilgiler</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Ad <span className="text-error">*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder="Personel adı"
                  className={inputClass}
                />
                {errors.name && (
                  <p className="text-error text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Soyad <span className="text-error">*</span>
                </label>
                <input
                  {...register("surname")}
                  placeholder="Personel soyadı"
                  className={inputClass}
                />
                {errors.surname && (
                  <p className="text-error text-xs mt-1">{errors.surname.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Telefon
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 py-3 bg-surface-container-high rounded-l-lg text-on-surface-variant text-sm font-medium border-r border-surface-container">
                    {phonePrefix}
                  </span>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <input
                        className={`${inputClass} rounded-l-none`}
                        placeholder="(5XX) XXX XX XX"
                        value={formatPhoneInput(field.value ?? "")}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                          field.onChange(digits)
                        }}
                      />
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  TC Kimlik No
                </label>
                <input
                  {...register("tcNo")}
                  placeholder="XXXXXXXXXXX"
                  maxLength={11}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: İş & Sözleşme Bilgileri */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container mb-6">
              <span className="material-symbols-outlined text-primary">work</span>
              <h3 className="text-lg font-bold text-on-surface">İş & Sözleşme Bilgileri</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Pozisyon
                </label>
                <select
                  {...register("positionId")}
                  className={inputClass}
                >
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
                  {...register("startDate")}
                  type="date"
                  className={inputClass}
                />
                {errors.startDate && (
                  <p className="text-error text-xs mt-1">{errors.startDate.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-on-surface mb-1.5 block">
                  Maaş <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register("salary")}
                    placeholder="0"
                    className={`${inputClass} pr-10`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">
                    ₺
                  </span>
                </div>
                {errors.salary && (
                  <p className="text-error text-xs mt-1">{errors.salary.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/personnel"
              className="bg-surface-container-highest text-on-surface font-semibold rounded-md px-6 py-3 transition-all hover:bg-surface-container-high"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary text-on-primary font-bold rounded-xl px-6 py-3 flex items-center gap-2 shadow-xl hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">check_circle</span>
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydı Tamamla"}
            </button>
          </div>
        </form>

        {/* Sidebar — 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Preview Card */}
          <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-6 shadow-[0_20px_40px_rgba(25,28,30,0.06)] ring-1 ring-white/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
              Önizleme
            </h4>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-lg">
                {watchedValues.name?.charAt(0)?.toUpperCase() || "?"}
                {watchedValues.surname?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold text-on-surface">
                  {watchedValues.name || "Ad"} {watchedValues.surname || "Soyad"}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {selectedPosition?.name || "Pozisyon belirtilmedi"}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {watchedValues.phone && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Telefon</span>
                  <span className="text-on-surface font-medium">
                    {phonePrefix} {watchedValues.phone}
                  </span>
                </div>
              )}
              {salaryNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Maaş</span>
                  <span className="text-on-surface font-semibold">
                    {formatCurrency(salaryNum)}
                  </span>
                </div>
              )}
              {watchedValues.startDate && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Başlangıç</span>
                  <span className="text-on-surface font-medium">
                    {new Intl.DateTimeFormat("tr-TR").format(new Date(watchedValues.startDate))}
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
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">check</span>
                Ad ve soyad alanları zorunludur.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">check</span>
                Telefon numarası +90 ile başlar.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">check</span>
                Pozisyonları &quot;Pozisyon Yönetimi&quot; sayfasından ekleyebilirsiniz.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5 shrink-0">check</span>
                Maaş bilgisi Türk Lirası olarak girilmelidir.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
