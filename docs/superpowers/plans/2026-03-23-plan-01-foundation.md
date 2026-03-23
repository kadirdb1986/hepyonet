# Plan 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js 15 project with Stitch design system, shadcn/ui (color overrides), API client, auth store, and all providers — creating the foundation for all subsequent modules.

**Architecture:** Next.js 15 App Router with Tailwind CSS v4. Stitch "Culinary Architect" design system applied via CSS custom properties and Tailwind config overrides. shadcn/ui components installed with custom theme. Zustand for auth state, axios for API calls with JWT interceptor, TanStack React Query for server state.

**Tech Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui, Zustand, @tanstack/react-query, axios, @supabase/supabase-js, react-hook-form, zod, sonner, date-fns, qrcode.react

**Spec:** `docs/superpowers/specs/2026-03-23-frontend-rebuild-design.md`

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tsconfig.json`

- [ ] **Step 0: Remove empty frontend directory**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
rm -rf frontend
```

The frontend directory is empty (previously deleted). Remove it so create-next-app can create a fresh one.

- [ ] **Step 1: Create Next.js 15 project**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
```

When prompted, accept defaults. This creates the base project structure.

- [ ] **Step 2: Verify project starts**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run dev
```

Expected: Server starts on localhost:3000 with no errors. Kill with Ctrl+C.

- [ ] **Step 3: Clean up boilerplate**

Remove default Next.js page content. Edit `frontend/src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/auth/login")
}
```

Remove default `frontend/src/app/globals.css` content — will be replaced in Task 3.

- [ ] **Step 4: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/
git commit -m "feat: initialize Next.js 15 project with App Router"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install core dependencies**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm install zustand @tanstack/react-query @tanstack/react-table axios @supabase/supabase-js react-hook-form @hookform/resolvers zod sonner date-fns qrcode.react recharts
```

Note: `recharts` is needed as a peer dependency for shadcn/ui charts.

- [ ] **Step 2: Create environment file**

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://phumnskfqmksrddsyihc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Add .env.local to .gitignore**

Verify `frontend/.gitignore` includes `.env.local` (Next.js default should have it).

- [ ] **Step 4: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: install core dependencies"
```

---

### Task 3: Set Up Stitch Design System — Globals & Tailwind

**Files:**
- Create: `frontend/src/app/globals.css`
- Modify: `frontend/tailwind.config.ts` (or equivalent Tailwind v4 config)

- [ ] **Step 1: Write globals.css with Stitch tokens and custom utilities**

Create `frontend/src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Stitch "The Culinary Architect" Color Tokens */
  --color-primary: #000000;
  --color-on-primary: #ffffff;
  --color-primary-container: #00174b;
  --color-on-primary-container: #497cff;
  --color-primary-fixed: #dbe1ff;
  --color-primary-fixed-dim: #b4c5ff;

  --color-secondary: #006e2d;
  --color-on-secondary: #ffffff;
  --color-secondary-container: #7cf994;
  --color-on-secondary-container: #007230;
  --color-secondary-fixed: #7ffc97;
  --color-secondary-fixed-dim: #62df7d;

  --color-tertiary: #000000;
  --color-on-tertiary: #ffffff;
  --color-tertiary-container: #2a1700;
  --color-on-tertiary-container: #b87500;
  --color-tertiary-fixed: #ffddb8;
  --color-tertiary-fixed-dim: #ffb95f;

  --color-error: #ba1a1a;
  --color-on-error: #ffffff;
  --color-error-container: #ffdad6;
  --color-on-error-container: #93000a;

  --color-surface: #f7f9fb;
  --color-surface-dim: #d8dadc;
  --color-surface-bright: #f7f9fb;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-low: #f2f4f6;
  --color-surface-container: #eceef0;
  --color-surface-container-high: #e6e8ea;
  --color-surface-container-highest: #e0e3e5;
  --color-surface-tint: #0053db;
  --color-surface-variant: #e0e3e5;

  --color-on-surface: #191c1e;
  --color-on-surface-variant: #45464d;
  --color-on-background: #191c1e;
  --color-background: #f7f9fb;

  --color-outline: #76777d;
  --color-outline-variant: #c6c6cd;

  --color-inverse-surface: #2d3133;
  --color-inverse-on-surface: #eff1f3;
  --color-inverse-primary: #b4c5ff;

  --color-on-primary-fixed: #00174b;
  --color-on-primary-fixed-variant: #003ea8;
  --color-on-secondary-fixed: #002109;
  --color-on-secondary-fixed-variant: #005320;
  --color-on-tertiary-fixed: #2a1700;
  --color-on-tertiary-fixed-variant: #653e00;

  /* Font Families */
  --font-headline: "Manrope", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-label: "Inter", sans-serif;

  /* Border Radius (Stitch) */
  --radius: 0.125rem;
  --radius-lg: 0.25rem;
  --radius-xl: 0.5rem;
  --radius-full: 0.75rem;
}

/* Material Symbols configuration */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Stitch Custom Utilities */
.editorial-gradient {
  background: linear-gradient(135deg, #f7f9fb 0%, #eceef0 100%);
}

.profit-glow {
  background: linear-gradient(45deg, #006e2d 0%, #7cf994 100%);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
}

/* Stitch ambient shadow */
.shadow-ambient {
  box-shadow: 0 20px 40px rgba(25, 28, 30, 0.06);
}

/* Ghost border utility */
.ghost-border {
  border: 1px solid rgba(198, 198, 205, 0.15);
}

/* Base styles */
body {
  font-family: var(--font-body);
  color: var(--color-on-surface);
  background-color: var(--color-surface);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-headline);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/app/globals.css
git commit -m "feat: add Stitch design system tokens and utilities"
```

---

### Task 4: Set Up Fonts and Icons in Root Layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Update root layout with Google Fonts and Material Symbols**

Edit `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "HepYonet - Restoran Yönetimi",
  description: "Restoran yönetim platformu",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify fonts load**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run dev
```

Open localhost:3000, inspect fonts in DevTools — Manrope and Inter should be loaded. Material Symbols should be available.

- [ ] **Step 3: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/app/layout.tsx
git commit -m "feat: add Google Fonts and Material Symbols to root layout"
```

---

### Task 5: Initialize shadcn/ui

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx` (and other base components)

- [ ] **Step 1: Initialize shadcn/ui**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 2: Install essential shadcn/ui components**

```bash
npx shadcn@latest add button input label card dialog dropdown-menu select badge tabs accordion switch checkbox popover separator table toast chart
```

- [ ] **Step 3: Override shadcn CSS variables for Stitch design system**

The shadcn init will have added CSS variables to globals.css. Replace or merge the shadcn variables so they map to Stitch tokens.

**IMPORTANT:** The exact format depends on what `npx shadcn@latest init` generates. Tailwind v4 + shadcn may use `oklch`, `hsl`, or direct hex values. Inspect the generated globals.css and adapt the values below to match that format. The mapping below uses hex values as the source of truth:

| shadcn variable | Stitch hex | Stitch token |
|----------------|-----------|--------------|
| --background | #f7f9fb | surface |
| --foreground | #191c1e | on-surface |
| --card | #ffffff | surface-container-lowest |
| --card-foreground | #191c1e | on-surface |
| --popover | #ffffff | surface-container-lowest |
| --popover-foreground | #191c1e | on-surface |
| --primary | #000000 | primary |
| --primary-foreground | #ffffff | on-primary |
| --secondary | #006e2d | secondary |
| --secondary-foreground | #ffffff | on-secondary |
| --muted | #f2f4f6 | surface-container-low |
| --muted-foreground | #45464d | on-surface-variant |
| --accent | #eceef0 | surface-container |
| --accent-foreground | #191c1e | on-surface |
| --destructive | #ba1a1a | error |
| --destructive-foreground | #ffffff | on-error |
| --border | rgba(198,198,205,0.15) | outline-variant @ 15% |
| --input | #f2f4f6 | surface-container-low |
| --ring | #0053db | surface-tint |
| --radius | 0.125rem | Stitch DEFAULT |

Convert these hex values to whatever color format shadcn v4 uses in your generated globals.css.

- [ ] **Step 4: Verify shadcn components render correctly**

Create a temporary test in `page.tsx`:

```tsx
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="p-8">
      <Button>Test Button</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  )
}
```

Verify buttons render with Stitch colors (primary = black, secondary = green, destructive = red).

- [ ] **Step 5: Restore page.tsx redirect and commit**

Restore `page.tsx` to redirect:

```tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/auth/login")
}
```

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/
git commit -m "feat: initialize shadcn/ui with Stitch design system overrides"
```

---

### Task 6: Create Utility Functions

**Files:**
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Write utility functions**

If shadcn init already created `utils.ts` with `cn()`, extend it. Otherwise create:

```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n)
}

export function formatPercent(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n / 100)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("0")) {
    return `0 (${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }
  if (digits.length === 10) {
    return `0 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  return phone
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateLong(date: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export function handleNumericInput(
  value: string,
  setter: (v: string) => void
) {
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(",", ".")
  setter(cleaned)
}

export function displayNumericValue(value: string | number): string {
  if (value === "" || value === undefined || value === null) return ""
  return String(value).replace(".", ",")
}

export function parseNumericValue(value: string): number {
  return parseFloat(value.replace(",", ".")) || 0
}

export function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(3).replace(/\.?0+$/, "").replace(".", ",")
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/lib/utils.ts
git commit -m "feat: add utility functions (formatting, numeric input)"
```

---

### Task 7: Create API Client with JWT Interceptor

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Write axios API client**

Create `frontend/src/lib/api.ts`:

```ts
import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
})

// Request interceptor: add auth token and restaurant ID
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const restaurantId = localStorage.getItem("activeRestaurantId")
    if (restaurantId) {
      config.headers["x-restaurant-id"] = restaurantId
    }
  }
  return config
})

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem("refreshToken")
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/auth/refresh`,
            { refreshToken }
          )
          const { accessToken, refreshToken: newRefresh } = res.data
          localStorage.setItem("accessToken", accessToken)
          localStorage.setItem("refreshToken", newRefresh)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem("accessToken")
          localStorage.removeItem("refreshToken")
          localStorage.removeItem("activeRestaurantId")
          window.location.href = "/auth/login"
          return Promise.reject(error)
        }
      } else {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("activeRestaurantId")
        window.location.href = "/auth/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/lib/api.ts
git commit -m "feat: add axios API client with JWT interceptor and token refresh"
```

---

### Task 8: Create Supabase Client

**Files:**
- Create: `frontend/src/lib/supabase.ts`

- [ ] **Step 1: Write Supabase client**

Create `frontend/src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/lib/supabase.ts
git commit -m "feat: add Supabase client for OAuth"
```

---

### Task 9: Create Auth Store (Zustand)

**Files:**
- Create: `frontend/src/stores/auth-store.ts`

- [ ] **Step 1: Write auth store**

Create `frontend/src/stores/auth-store.ts`:

```ts
import { create } from "zustand"

export interface Membership {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  role: string
  restaurantStatus: string
}

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  isSuperAdmin: boolean
  memberships: Membership[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  activeRestaurantId: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  switchRestaurant: (restaurantId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeRestaurantId:
    typeof window !== "undefined"
      ? localStorage.getItem("activeRestaurantId")
      : null,

  setUser: (user) => {
    if (user) {
      const approvedMemberships = user.memberships.filter(
        (m) => m.restaurantStatus === "APPROVED"
      )
      const storedRestaurantId =
        typeof window !== "undefined"
          ? localStorage.getItem("activeRestaurantId")
          : null
      const activeId =
        storedRestaurantId &&
        approvedMemberships.some((m) => m.restaurantId === storedRestaurantId)
          ? storedRestaurantId
          : approvedMemberships[0]?.restaurantId || null

      if (activeId && typeof window !== "undefined") {
        localStorage.setItem("activeRestaurantId", activeId)
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        activeRestaurantId: activeId,
      })
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        activeRestaurantId: null,
      })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  switchRestaurant: (restaurantId) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("activeRestaurantId", restaurantId)
    }
    set({ activeRestaurantId: restaurantId })
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("activeRestaurantId")
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRestaurantId: null,
    })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/stores/auth-store.ts
git commit -m "feat: add Zustand auth store with multi-restaurant support"
```

---

### Task 10: Create Auth Hook

**Files:**
- Create: `frontend/src/hooks/use-auth.ts`

- [ ] **Step 1: Write auth hook**

Create `frontend/src/hooks/use-auth.ts`:

```ts
"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, activeRestaurantId, setUser, setLoading, switchRestaurant, logout: storeLogout } = useAuthStore()

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get("/auth/me")
      setUser(res.data)
    } catch {
      storeLogout()
    }
  }, [setUser, setLoading, storeLogout])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password })
    const { accessToken, refreshToken, user: userData } = res.data
    localStorage.setItem("accessToken", accessToken)
    localStorage.setItem("refreshToken", refreshToken)
    setUser(userData)
    router.push("/dashboard")
  }

  const register = async (data: {
    email: string
    password: string
    name: string
    restaurantName?: string
  }) => {
    const res = await api.post("/auth/register", data)
    return res.data
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const forgotPassword = async (email: string) => {
    await api.post("/auth/forgot-password", { email })
  }

  const logout = () => {
    storeLogout()
    router.push("/auth/login")
  }

  const activeMembership = user?.memberships.find(
    (m) => m.restaurantId === activeRestaurantId && m.restaurantStatus === "APPROVED"
  )

  return {
    user,
    isAuthenticated,
    isLoading,
    activeRestaurantId,
    activeMembership,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    logout,
    switchRestaurant,
    checkAuth,
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/hooks/use-auth.ts
git commit -m "feat: add useAuth hook with login, register, OAuth, and token management"
```

---

### Task 11: Create Query Provider

**Files:**
- Create: `frontend/src/components/providers/query-provider.tsx`

- [ ] **Step 1: Write query provider**

Create `frontend/src/components/providers/query-provider.tsx`:

```tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

- [ ] **Step 2: Update root layout to include providers and Toaster**

Edit `frontend/src/app/layout.tsx` — wrap children with QueryProvider and add Toaster:

```tsx
import type { Metadata } from "next"
import { Toaster } from "sonner"
import { QueryProvider } from "@/components/providers/query-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "HepYonet - Restoran Yönetimi",
  description: "Restoran yönetim platformu",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-surface text-on-surface antialiased">
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/components/providers/query-provider.tsx frontend/src/app/layout.tsx
git commit -m "feat: add QueryProvider and Sonner Toaster to root layout"
```

---

### Task 12: Create Turkish String Constants

**Files:**
- Create: `frontend/src/messages/tr.json`

- [ ] **Step 1: Write base Turkish strings**

Create `frontend/src/messages/tr.json`:

```json
{
  "common": {
    "save": "Kaydet",
    "cancel": "İptal",
    "delete": "Sil",
    "edit": "Düzenle",
    "add": "Ekle",
    "search": "Ara...",
    "loading": "Yükleniyor...",
    "noData": "Veri bulunamadı",
    "confirm": "Onayla",
    "back": "Geri",
    "actions": "İşlemler",
    "yes": "Evet",
    "no": "Hayır",
    "close": "Kapat",
    "active": "Aktif",
    "inactive": "Pasif",
    "pending": "Bekliyor",
    "approved": "Onaylı",
    "rejected": "Reddedildi"
  },
  "auth": {
    "login": "Giriş Yap",
    "register": "Kayıt Ol",
    "email": "E-posta",
    "password": "Şifre",
    "name": "Ad Soyad",
    "restaurantName": "Restoran Adı",
    "loginWithGoogle": "Google ile Giriş",
    "forgotPassword": "Şifremi Unuttum",
    "noAccount": "Hesabınız yok mu?",
    "hasAccount": "Zaten hesabınız var mı?",
    "loggingIn": "Giriş yapılıyor...",
    "waitingApproval": "Restoran onayı bekleniyor."
  },
  "roles": {
    "OWNER": "Sahip",
    "ADMIN": "Yönetici",
    "ACCOUNTANT": "Muhasebe",
    "HR": "İnsan Kaynakları",
    "STOCK_MANAGER": "Depocu",
    "MENU_MANAGER": "Menü Yöneticisi",
    "WAITER": "Garson"
  },
  "nav": {
    "panel": "Panel",
    "personnel": "Personel",
    "finance": "Finans",
    "revenues": "Cirolar",
    "expenses": "Giderler",
    "inventory": "Stok",
    "products": "Ürünler",
    "menu": "Menü",
    "simulation": "Simülasyon",
    "reports": "Raporlar",
    "settings": "Ayarlar",
    "users": "Kullanıcılar"
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/src/messages/tr.json
git commit -m "feat: add Turkish string constants"
```

---

### Task 13: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with new tech decisions**

Update the following lines in `/Users/kadirdogrubakar/Desktop/claude/hepyonet/CLAUDE.md`:

Replace the icon line:
```
- İkon: lucide-react
```
with:
```
- İkon: Google Material Symbols (Outlined, 24px) — Google Fonts CSS ile yüklenir
```

Replace the chart line:
```
- Grafik: recharts
```
with:
```
- Grafik: shadcn/ui charts
```

Add font line after UI line:
```
- Font: Manrope (başlıklar) + Inter (body) — Google Fonts
```

Remove from package list:
```
- xlsx
- motion
- html5-qrcode
```

Keep:
```
- qrcode.react
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Stitch design system tech decisions"
```

---

### Task 14: Verify Full Foundation

- [ ] **Step 1: Start dev server and verify no errors**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run dev
```

Expected: Server starts cleanly. No TypeScript or build errors.

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 3: Verify all files exist**

Check directory structure matches the plan:
```
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── providers/
│   │   └── query-provider.tsx
│   └── ui/
│       └── (shadcn components)
├── hooks/
│   └── use-auth.ts
├── stores/
│   └── auth-store.ts
├── lib/
│   ├── api.ts
│   ├── supabase.ts
│   └── utils.ts
└── messages/
    └── tr.json
```

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
git add frontend/
git commit -m "fix: foundation verification fixes"
```

Only run this step if fixes were required.
