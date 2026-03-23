"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const menuItems = [
  { label: "Dashboard", icon: "dashboard", href: "/admin" },
  { label: "Restoranlar", icon: "storefront", href: "/admin/restaurants" },
]

function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  return (
    <aside className="h-screen w-56 fixed left-0 top-0 hidden lg:flex flex-col bg-surface-container-low p-4 overflow-y-auto z-50">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="font-black text-xl text-on-surface tracking-tight font-headline">
          HepYonet
        </h1>
        <p className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase">
          Admin Panel
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {menuItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 my-0.5 rounded-md text-sm transition-all ${
                active
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-bold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto border-t border-outline-variant/20 pt-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 text-on-surface-variant hover:text-on-surface px-4 py-2 transition-colors text-sm w-full"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Çıkış</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading } = useAuth()

  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated && !isLoginPage) {
      router.push("/admin/login")
      return
    }

    if (isAuthenticated && user && !user.isSuperAdmin && !isLoginPage) {
      router.push("/dashboard")
      return
    }
  }, [isLoading, isAuthenticated, user, isLoginPage, router])

  // Loading
  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Login page — no sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Not authenticated or not super admin
  if (!isAuthenticated || !user?.isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />
      <main className="lg:ml-56 min-h-screen">
        <div className="p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
