"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { CreateRestaurantScreen } from "@/components/layout/create-restaurant-screen"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, activeMembership } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isLoading, isAuthenticated, router])

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) return null

  // SuperAdmin → redirect to admin
  if (user.isSuperAdmin && !activeMembership) {
    router.push("/admin")
    return null
  }

  // No approved restaurant
  if (!activeMembership) {
    return <CreateRestaurantScreen />
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <main className="lg:ml-64 min-h-screen">
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="p-8 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
