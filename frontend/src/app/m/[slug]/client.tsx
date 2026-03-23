"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuProduct {
  id: string
  name: string
  code?: string
  description?: string
  image?: string
  price: number
}

interface MenuCategory {
  id: string
  name: string
  items: MenuProduct[]
}

interface PublicMenuData {
  restaurant: {
    name: string
    logo?: string
  }
  categories: MenuCategory[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── Client Component ─────────────────────────────────────────────────────────

export function PublicMenuClient({ data }: { data: PublicMenuData }) {
  const [activeCategory, setActiveCategory] = useState<string>("")
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map())
  const navRef = useRef<HTMLDivElement>(null)
  const isScrollingTo = useRef(false)

  const categories = data.categories.filter((c) => c.items.length > 0)

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories, activeCategory])

  // IntersectionObserver to track active category on scroll
  useEffect(() => {
    if (categories.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id)
            break
          }
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    )

    categoryRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [categories])

  // Scroll to category on pill click
  const scrollToCategory = useCallback((categoryId: string) => {
    const el = categoryRefs.current.get(categoryId)
    if (!el) return
    isScrollingTo.current = true
    setActiveCategory(categoryId)
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    setTimeout(() => {
      isScrollingTo.current = false
    }, 800)
  }, [])

  // Scroll active pill into view in the nav bar
  useEffect(() => {
    if (!navRef.current) return
    const activeBtn = navRef.current.querySelector(`[data-category="${activeCategory}"]`) as HTMLElement | null
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [activeCategory])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-amber-200/40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {data.restaurant.logo ? (
            <Image
              src={data.restaurant.logo}
              alt={data.restaurant.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
              {data.restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="font-extrabold text-lg text-amber-950 tracking-tight">
            {data.restaurant.name}
          </h1>
        </div>
      </header>

      {/* Category Navigation */}
      {categories.length > 1 && (
        <nav className="sticky top-[57px] z-40 bg-white/60 backdrop-blur-lg border-b border-amber-200/30">
          <div
            ref={navRef}
            className="max-w-3xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                data-category={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-10">
        {categories.map((cat) => (
          <section
            key={cat.id}
            id={cat.id}
            ref={(el) => {
              if (el) categoryRefs.current.set(cat.id, el)
            }}
            className="scroll-mt-28"
          >
            <h2 className="text-xl font-extrabold text-amber-950 mb-4 tracking-tight">
              {cat.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-amber-100/80 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {item.image && (
                    <div className="aspect-[4/3] overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-amber-950 text-sm">
                          {item.name}
                        </h3>
                        {item.code && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 mt-1 font-mono">
                            {item.code}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-amber-700 text-sm whitespace-nowrap">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-amber-800/60 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-amber-800/60 text-lg">Bu menu henuz bos.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-200/40 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-amber-800/40">
            &copy; {new Date().getFullYear()} {data.restaurant.name}
          </p>
          <p className="text-[10px] text-amber-800/30 mt-1">
            Powered by HepYonet
          </p>
        </div>
      </footer>
    </div>
  )
}
