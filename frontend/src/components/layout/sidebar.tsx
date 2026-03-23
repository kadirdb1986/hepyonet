"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

const mainMenuItems = [
  { label: "Panel", icon: "dashboard", href: "/dashboard" },
  { label: "Personel", icon: "group", href: "/dashboard/personnel" },
  {
    label: "Finans",
    icon: "payments",
    href: "/dashboard/finance",
    children: [
      { label: "Cirolar", href: "/dashboard/finance/revenues" },
      { label: "Giderler", href: "/dashboard/finance/expenses" },
      { label: "Dağıtım", href: "/dashboard/finance/distribute" },
    ],
  },
  { label: "Stok", icon: "inventory_2", href: "/dashboard/inventory" },
  { label: "Ürünler", icon: "inventory", href: "/dashboard/products" },
  { label: "Menü", icon: "restaurant_menu", href: "/dashboard/menu" },
  { label: "Simülasyon", icon: "analytics", href: "/dashboard/simulation" },
  { label: "Raporlar", icon: "assessment", href: "/dashboard/reports" },
]

const bottomMenuItems = [
  { label: "Ayarlar", icon: "settings", href: "/dashboard/settings" },
  { label: "Kullanıcılar", icon: "manage_accounts", href: "/dashboard/users" },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const NavItem = ({ item }: { item: (typeof mainMenuItems)[0] }) => {
    const active = isActive(item.href)
    const hasChildren = "children" in item && item.children
    const childActive =
      hasChildren && item.children!.some((c) => pathname.startsWith(c.href))

    return (
      <div>
        <Link
          href={item.href}
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-2 my-1 rounded-md text-sm transition-all ${
            active || childActive
              ? "bg-surface-container-lowest text-on-surface shadow-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
        {hasChildren && (active || childActive) && (
          <div className="ml-10 flex flex-col gap-0.5 mt-0.5">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className={`text-sm py-1.5 px-3 rounded-md transition-all border-l-2 ${
                  pathname.startsWith(child.href)
                    ? "border-primary text-on-surface font-semibold"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="mb-8">
        <h1 className="font-black text-2xl text-on-surface tracking-tight font-headline">
          HepYonet
        </h1>
        <p className="text-xs text-on-surface-variant font-medium tracking-wider uppercase">
          Restaurant Management
        </p>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {mainMenuItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant/20 pt-4">
        {bottomMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors ${
              isActive(item.href)
                ? "text-on-surface font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex items-center gap-3 text-on-surface-variant hover:text-on-surface px-4 py-2 transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Çıkış</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 hidden lg:flex flex-col bg-surface-container-low p-4 overflow-y-auto z-50">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={onClose}
          />
          <aside className="h-screen w-72 fixed left-0 top-0 flex flex-col bg-surface-container-low p-4 overflow-y-auto z-50 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
