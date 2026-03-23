"use client"

import { useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"

export function CreateRestaurantScreen() {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    try {
      await api.post("/restaurants", { name: name.trim() })
      setSubmitted(true)
      toast.success("Restoran oluşturuldu! Onay bekleniyor.")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Restoran oluşturulamadı")
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <span
            className="material-symbols-outlined text-secondary text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            hourglass_top
          </span>
          <h2 className="font-headline text-2xl font-bold text-on-surface">
            Onay Bekleniyor
          </h2>
          <p className="text-on-surface-variant">
            Restoranınız oluşturuldu ve onay bekliyor. Onaylandığında bu sayfayı
            yenileyerek devam edebilirsiniz.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <span className="material-symbols-outlined text-primary text-5xl">store</span>
          <h2 className="font-headline text-2xl font-bold text-on-surface">
            Restoran Oluştur
          </h2>
          <p className="text-on-surface-variant text-sm">
            Başlamak için restoranınızın adını girin.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest p-8 rounded-xl shadow-ambient space-y-6"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">
              Restoran Adı
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50 text-on-surface outline-none"
              placeholder="Lezzet Durağı"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-lg shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        </form>
      </div>
    </div>
  )
}
