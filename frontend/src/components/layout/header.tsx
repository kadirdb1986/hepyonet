"use client"

import { useAuth } from "@/hooks/use-auth"
import { useQueryClient } from "@tanstack/react-query"

const roleLabels: Record<string, string> = {
  OWNER: "Sahip",
  ADMIN: "Yönetici",
  ACCOUNTANT: "Muhasebe",
  HR: "İnsan Kaynakları",
  STOCK_MANAGER: "Depocu",
  MENU_MANAGER: "Menü Yöneticisi",
  WAITER: "Garson",
}

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, activeMembership, switchRestaurant, logout } = useAuth()
  const queryClient = useQueryClient()

  const handleSwitchRestaurant = (restaurantId: string) => {
    switchRestaurant(restaurantId)
    queryClient.invalidateQueries()
  }

  const approvedMemberships =
    user?.memberships.filter((m) => m.restaurantStatus === "APPROVED") || []

  return (
    <header className="flex justify-between items-center w-full px-6 py-3 h-16 sticky top-0 z-40 bg-surface-bright">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <div className="h-6 w-[1px] bg-outline-variant/30" />

        {/* Restaurant Selector */}
        {approvedMemberships.length > 1 ? (
          <select
            value={activeMembership?.restaurantId || ""}
            onChange={(e) => handleSwitchRestaurant(e.target.value)}
            className="text-xs font-semibold text-on-surface bg-transparent border border-outline-variant/20 rounded-md px-3 py-1.5 outline-none cursor-pointer"
          >
            {approvedMemberships.map((m) => (
              <option key={m.restaurantId} value={m.restaurantId}>
                {m.restaurantName}
              </option>
            ))}
          </select>
        ) : activeMembership ? (
          <span className="text-xs font-semibold text-on-surface px-3 py-1.5">
            {activeMembership.restaurantName}
          </span>
        ) : null}

        {/* Avatar */}
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() || "?"}
          </div>
        </div>
      </div>
    </header>
  )
}
