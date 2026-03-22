# shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire HepYonet frontend to use shadcn/ui components, Lucide icons, and shadcn CSS variable tokens — eliminating all hardcoded colors, Material Symbols icons, and custom HTML elements.

**Architecture:** Layout-first approach — clean the theme foundation (globals.css), then migrate layout shell (sidebar/header), then page modules from heaviest to lightest. Each task produces a commit.

**Tech Stack:** Next.js 15, shadcn/ui (radix-nova), Tailwind CSS v4, Lucide React, recharts

**Spec:** `docs/superpowers/specs/2026-03-22-shadcn-migration-design.md`

---

## Task 1: globals.css Cleanup

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Remove custom design system variables from `@theme inline`**

Remove these lines from the `@theme inline` block (lines 51-74):
```css
/* Remove all of these: */
--color-ds-primary: #004253;
--color-ds-primary-container: #005b71;
--color-ds-on-primary: #ffffff;
--color-ds-surface: #f8fafb;
--color-ds-surface-container-low: #f2f4f5;
--color-ds-surface-container: #eceeef;
--color-ds-surface-container-high: #e6e8e9;
--color-ds-surface-container-highest: #e1e3e4;
--color-ds-surface-container-lowest: #ffffff;
--color-ds-on-surface: #191c1d;
--color-ds-on-surface-variant: #40484c;
--color-ds-outline: #70787d;
--color-ds-outline-variant: #bfc8cc;
--color-ds-secondary: #516164;
--color-ds-secondary-container: #d4e6e9;
--color-ds-on-secondary-container: #57676a;
--color-ds-error: #ba1a1a;
--color-ds-error-container: #ffdad6;
--color-ds-tertiary: #004448;
--color-ds-tertiary-fixed: #7df4ff;
--color-ds-on-tertiary-fixed-variant: #004f54;
--font-heading: var(--font-sans);
```

Keep `--font-headline` and `--font-body` in `@theme inline`.

- [ ] **Step 2: Remove custom color variables from `:root`**

Remove these lines from `:root` (lines 78-98):
```css
/* Remove all of these: */
--color-primary: #004253;
--color-primary-container: #005b71;
--color-on-primary: #ffffff;
--color-surface: #f8fafb;
--color-surface-container-low: #f2f4f5;
--color-surface-container: #eceeef;
--color-surface-container-high: #e6e8e9;
--color-surface-container-highest: #e1e3e4;
--color-surface-container-lowest: #ffffff;
--color-on-surface: #191c1d;
--color-on-surface-variant: #40484c;
--color-outline: #70787d;
--color-outline-variant: #bfc8cc;
--color-secondary: #516164;
--color-secondary-container: #d4e6e9;
--color-on-secondary-container: #57676a;
--color-error: #ba1a1a;
--color-error-container: #ffdad6;
--color-tertiary: #004448;
--color-tertiary-fixed: #7df4ff;
--color-on-tertiary-fixed-variant: #004f54;
```

Keep all shadcn oklch variables (`--card`, `--primary`, `--secondary`, etc.).

- [ ] **Step 3: Remove Material Symbols CSS rule**

Remove lines 167-169:
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

- [ ] **Step 4: Fix body styles in `@layer base`**

Replace body rule (lines 178-182):
```css
/* FROM: */
body {
  @apply font-body bg-background text-foreground;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

/* TO: */
body {
  @apply font-body bg-background text-foreground;
}
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds (pages using removed variables will show visual changes but won't break)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "refactor: remove custom design system colors from globals.css, keep shadcn defaults"
```

---

## Task 2: Sidebar Migration

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Read current sidebar**

Read `frontend/src/components/layout/sidebar.tsx` to understand the current structure, Material Symbols usage pattern, and NavItem component.

- [ ] **Step 2: Replace Material Symbols imports and icon rendering**

Replace all `<span className="material-symbols-outlined">icon_name</span>` patterns with Lucide React components. Add Lucide imports:

```tsx
import {
  LayoutDashboard, Users, CreditCard, TrendingUp, TrendingDown,
  Package, UtensilsCrossed, BookOpen, BarChart3, FlaskConical,
  Settings, UserCog, X, Menu
} from 'lucide-react';
```

Icon mapping for sidebar:
- `dashboard` → `<LayoutDashboard className="size-5" />`
- `group` → `<Users className="size-5" />`
- `payments` → `<CreditCard className="size-5" />`
- `trending_up` → `<TrendingUp className="size-5" />`
- `trending_down` → `<TrendingDown className="size-5" />`
- `inventory_2` → `<Package className="size-5" />`
- `fastfood` / `restaurant_menu` → `<UtensilsCrossed className="size-5" />`
- `menu_book` → `<BookOpen className="size-5" />`
- `analytics` / `assessment` → `<BarChart3 className="size-5" />`
- `science` → `<FlaskConical className="size-5" />`
- `settings` → `<Settings className="size-5" />`
- `manage_accounts` → `<UserCog className="size-5" />`
- `restaurant` → `<UtensilsCrossed className="size-5" />`
- `menu` → `<Menu className="size-5" />`

- [ ] **Step 3: Replace Tailwind color classes**

Replace all hardcoded/Tailwind colors:
- `text-teal-900`, `text-teal-800` → `text-sidebar-foreground`
- `border-teal-900` → `border-sidebar-border`
- `bg-slate-100`, `bg-slate-200` → `bg-sidebar-accent`
- `text-slate-500`, `text-slate-400` → `text-sidebar-foreground/60`
- `bg-white` → `bg-sidebar`
- Any hex colors (`#004253`, `#70787d`) in inline styles → remove, use Tailwind classes

- [ ] **Step 4: Replace custom NavItem with shadcn Button**

Replace custom NavItem styling with shadcn-compatible approach:
```tsx
import { Button } from '@/components/ui/button';

// Active state:
<Button variant="ghost" className="w-full justify-start gap-3 bg-sidebar-accent text-sidebar-accent-foreground">
  <LayoutDashboard className="size-5" />
  Panel
</Button>

// Inactive state:
<Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground">
  <Users className="size-5" />
  Personel
</Button>
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/sidebar.tsx
git commit -m "refactor: migrate sidebar to Lucide icons and shadcn tokens"
```

---

## Task 3: Header Migration

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`

- [ ] **Step 1: Read current header**

Read `frontend/src/components/layout/header.tsx`.

- [ ] **Step 2: Replace Material Symbols with Lucide**

Replace 3 Material Symbols:
- `<span className="material-symbols-outlined">menu</span>` → `<Menu className="size-5" />`
- `<span className="material-symbols-outlined">search</span>` → `<Search className="size-5" />`
- `<span className="material-symbols-outlined">notifications</span>` → `<Bell className="size-5" />`

Add imports:
```tsx
import { Menu, Search, Bell } from 'lucide-react';
```

- [ ] **Step 3: Replace Tailwind color classes**

- `text-teal-900`, `text-teal-800` → `text-foreground`
- `text-slate-600` → `text-muted-foreground`
- `text-slate-50` → `text-primary-foreground`
- `bg-slate-50`, `bg-slate-100` → `bg-muted`
- `hover:bg-slate-100` → `hover:bg-muted`
- `border-teal-900` → `border-primary`
- `text-red-600` → `text-destructive`
- Any hex colors (`#70787d`, `#004253`, `#191c1d`, `#d4e6e9`, `#bfc8cc`) → replace with shadcn classes

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/header.tsx
git commit -m "refactor: migrate header to Lucide icons and shadcn tokens"
```

---

## Task 4: Install Missing shadcn Components

**Files:**
- Create: `frontend/src/components/ui/popover.tsx` (via shadcn CLI)

- [ ] **Step 1: Install Popover component**

```bash
cd frontend && npx shadcn@latest add popover
```

- [ ] **Step 2: Verify component exists**

Check that `frontend/src/components/ui/popover.tsx` was created.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/popover.tsx
git commit -m "chore: add shadcn Popover component for inventory migration"
```

---

## Task 5: Dashboard Page Migration

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Read current dashboard page**

Read `frontend/src/app/dashboard/page.tsx` thoroughly — this is a heavily customized page with bento grid, custom cards, and inline hex colors.

- [ ] **Step 2: Add shadcn and Lucide imports**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, TrendingUp, Receipt, Wallet, Users } from 'lucide-react';
```

- [ ] **Step 3: Replace Material Symbols icons**

Replace all 6 Material Symbols with Lucide equivalents:
- `calendar_today` → `<Calendar className="size-5" />`
- `add` → `<Plus className="size-5" />`
- `trending_up` → `<TrendingUp className="size-5" />`
- `payments` → `<Receipt className="size-5" />` (Note: in sidebar this icon maps to `CreditCard` for navigation context; here `Receipt` is used because it represents the expenses metric card)
- `account_balance_wallet` → `<Wallet className="size-5" />`
- `group` → `<Users className="size-5" />`

- [ ] **Step 4: Replace custom cards with shadcn Card**

Replace custom `<div>` card containers with shadcn Card components. Map inline styles:
- `backgroundColor: '#f2f4f5'` → `className="bg-muted"`
- `backgroundColor: '#004253'` → `className="bg-primary"`
- `color: '#ffffff'` → `className="text-primary-foreground"`
- `color: '#191c1d'` → `className="text-foreground"`
- `color: '#70787d'` → `className="text-muted-foreground"`
- `color: '#40484c'` → `className="text-muted-foreground"`
- `color: '#ba1a1a'` → `className="text-destructive"`
- `backgroundColor: '#ffdad6'` → `className="bg-destructive/10"`
- `backgroundColor: '#d4e6e9'` → `className="bg-secondary"`
- `color: '#005b71'` → `className="text-primary"`
- `backgroundColor: '#005d63'` → `className="bg-primary"`
- `color: '#7df4ff'` → `className="text-accent-foreground"` (or use a chart token)

- [ ] **Step 5: Replace custom buttons and badges**

- Custom `<button>` → `<Button variant="..." size="...">`
- Custom badge `<span>` → `<Badge variant="...">`

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "refactor: migrate dashboard to shadcn components and Lucide icons"
```

---

## Task 6: Products Module Migration

**Files:**
- Modify: `frontend/src/app/dashboard/products/page.tsx`
- Modify: `frontend/src/app/dashboard/products/new/page.tsx`
- Modify: `frontend/src/app/dashboard/products/[id]/page.tsx`
- Modify: `frontend/src/app/dashboard/products/categories/page.tsx`

- [ ] **Step 1: Read all products files**

Read all 4 files to understand the current structure.

- [ ] **Step 2: Migrate products/page.tsx — icons**

Replace 8 Material Symbols with Lucide:
- `chevron_right` → `<ChevronRight className="size-4" />`
- `category` → `<Tag className="size-5" />`
- `reorder` → `<GripVertical className="size-4" />`
- `add` → `<Plus className="size-5" />`
- `search` → `<Search className="size-4" />`
- `edit` → `<Pencil className="size-4" />`
- `delete` → `<Trash2 className="size-4" />`
- `add_circle` → `<PlusCircle className="size-5" />`

- [ ] **Step 3: Migrate products/page.tsx — replace custom table with shadcn Table**

Replace custom `<table>` / `<div>` table with:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
```

- [ ] **Step 4: Migrate products/page.tsx — replace all hardcoded colors**

Replace all hex colors with shadcn tokens (see Color Migration table in spec).

- [ ] **Step 5: Migrate sub-pages — fix colors**

For `new/page.tsx`, `[id]/page.tsx`, `categories/page.tsx`:
- Replace `text-gray-500` → `text-muted-foreground`
- Replace `text-gray-400` → `text-muted-foreground`
- Replace `text-red-600` → `text-destructive`
- Replace `text-slate-100`, `text-slate-50` → `text-muted`
- Replace any remaining hex colors

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/products/
git commit -m "refactor: migrate products module to shadcn components and Lucide icons"
```

---

## Task 7: Inventory Module Migration

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/page.tsx`
- Modify: `frontend/src/app/dashboard/inventory/movements/page.tsx`
- Modify: `frontend/src/app/dashboard/inventory/suppliers/page.tsx`

- [ ] **Step 1: Read all inventory files**

Read all 3 files. The main page.tsx is 988 lines — the largest file.

- [ ] **Step 2: Migrate inventory/page.tsx — icons**

Replace all Material Symbols with Lucide:
- `local_shipping` → `<Truck className="size-5" />`
- `category` → `<Tag className="size-5" />`
- `add` → `<Plus className="size-5" />`
- `warning` → `<AlertTriangle className="size-5" />`
- `search` → `<Search className="size-4" />`
- `tune` → `<SlidersHorizontal className="size-5" />`
- `file_download` → `<Download className="size-5" />`
- `inventory_2` → `<Package className="size-5" />`
- `chevron_left` → `<ChevronLeft className="size-4" />`
- `chevron_right` → `<ChevronRight className="size-4" />`
- `edit` → `<Pencil className="size-4" />`
- `delete` → `<Trash2 className="size-4" />`
- Second `inventory_2` (empty state) → `<Package className="size-12" />` (larger for illustration)

- [ ] **Step 3: Migrate inventory/page.tsx — replace custom Popover**

Replace custom SupplierPopover with shadcn Popover (installed in Task 4):
```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
```

- [ ] **Step 4: Migrate inventory/page.tsx — replace all hardcoded colors**

Replace all hex colors (`#004253`, `#f2f4f5`, `#e6e8e9`, `#d4e6e9`, `#57676a`, `#70787d`, `#191c1d`, `#40484c`, `#e1e3e4`, `#bfc8cc`, `#ffdad6`, `#ba1a1a`, `#93000a`, `#005b71`) and Tailwind colors (`text-gray-500`, `text-gray-400`, `text-slate-100`, `gray-50`) with shadcn tokens.

- [ ] **Step 5: Migrate sub-pages**

For `movements/page.tsx`:
- `text-gray-500` → `text-muted-foreground`
- `gray-50` → `bg-muted`
- `bg-green-100 text-green-800` → `bg-green-100 text-green-800` (semantic status, exempt)
- `bg-red-100 text-red-800` → `bg-destructive/10 text-destructive`

For `suppliers/page.tsx`:
- `text-gray-500` → `text-muted-foreground`
- `text-red-500` → `text-destructive`

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/inventory/
git commit -m "refactor: migrate inventory module to shadcn components and Lucide icons"
```

---

## Task 8: Finance Module Migration

**Files:**
- Modify: `frontend/src/app/dashboard/finance/page.tsx`
- Modify: `frontend/src/app/dashboard/finance/revenues/page.tsx`
- Modify: `frontend/src/app/dashboard/finance/expenses/page.tsx`
- Modify: `frontend/src/app/dashboard/finance/distribute/page.tsx`

- [ ] **Step 1: Read all finance files**

Read all 4 files. Main page is 623 lines with custom SVG DonutChart.

- [ ] **Step 2: Migrate finance/page.tsx — icons**

Replace all Material Symbols with Lucide:
- `calendar_today` → `<Calendar className="size-5" />`
- `chevron_left` → `<ChevronLeft className="size-4" />`
- `chevron_right` → `<ChevronRight className="size-4" />`
- `upload` → `<Upload className="size-5" />`
- `add` → `<Plus className="size-5" />`
- `trending_up` → `<TrendingUp className="size-5" />`
- `trending_down` → `<TrendingDown className="size-5" />`
- `account_balance_wallet` → `<Wallet className="size-5" />`
- `filter_list` → `<Filter className="size-5" />`
- `search` → `<Search className="size-4" />`
- `receipt_long` → `<Receipt className="size-5" />`
- `point_of_sale` → `<Monitor className="size-5" />`
- `request_quote` → `<FileText className="size-5" />`

- [ ] **Step 3: Replace custom SVG DonutChart with recharts PieChart**

Replace custom SVG donut chart with recharts (already in dependencies):
```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Use shadcn chart CSS variables:
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
```

Note: Since shadcn uses oklch, the chart variable values should be used directly without `hsl()` wrapper. Test at implementation time.

- [ ] **Step 4: Replace all hardcoded colors**

Replace all hex colors and Tailwind color classes with shadcn tokens per the spec color mapping tables. Additionally:
- `bg-teal-50` → `bg-primary/10`
- `bg-teal-500` → `bg-primary`
- `hover:bg-slate-50` → `hover:bg-muted`
- `text-blue-600` → keep (semantic info indicator, exempt)
- `text-yellow-600` → keep (semantic status indicator, exempt)

- [ ] **Step 5: Migrate sub-pages**

For `revenues/page.tsx`:
- Replace hex colors (`#70787d`, `#004253`, `#bfc8cc`)
- Replace `green-600`, `gray-50`, `gray-400` → shadcn tokens
- Replace `text-blue-600` → keep (semantic info, exempt)
- Replace recharts hardcoded fill `#16a34a` → `var(--chart-2)` and other fill colors with chart CSS variables

For `expenses/page.tsx`:
- Replace hex colors and `gray-50`, `text-gray-400`, `text-red-600` → shadcn tokens

For `distribute/page.tsx`:
- Replace hex colors and `gray-50`, `gray-400` → shadcn tokens
- `text-blue-600` → keep (semantic info, exempt)

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/finance/
git commit -m "refactor: migrate finance module to shadcn components, recharts, and Lucide icons"
```

---

## Task 9: Personnel Module Color Cleanup

**Files:**
- Modify: `frontend/src/app/dashboard/personnel/page.tsx`
- Modify: `frontend/src/app/dashboard/personnel/new/page.tsx`
- Modify: `frontend/src/app/dashboard/personnel/[id]/page.tsx`
- Modify: `frontend/src/app/dashboard/personnel/positions/page.tsx`

- [ ] **Step 1: Read all personnel files**

- [ ] **Step 2: Fix Tailwind color classes across all files**

`page.tsx`:
- `text-gray-500` → `text-muted-foreground`
- `text-red-500` → `text-destructive`
- `text-green-500` → keep (semantic success indicator, exempt)

`new/page.tsx`:
- `gray-500` → `text-muted-foreground`
- `red-600` → `text-destructive`
- `red-50` → `bg-destructive/10`

`[id]/page.tsx`:
- `gray-500` → `text-muted-foreground`
- `text-orange-600`, `text-orange-500` → keep (semantic status, exempt) or use `text-amber-600`
- `text-blue-600` → keep (semantic info, exempt)
- `text-purple-600` → keep (semantic, exempt)
- `text-green-600` → keep (semantic success, exempt)

`positions/page.tsx`:
- `text-red-500` → `text-destructive`

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/personnel/
git commit -m "refactor: migrate personnel module colors to shadcn tokens"
```

---

## Task 10: Menu Module Cleanup

**Files:**
- Modify: `frontend/src/app/dashboard/menu/page.tsx`
- Modify: `frontend/src/app/dashboard/menu/qr/page.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Fix color classes**

`page.tsx`:
- `text-gray-300` → `text-muted-foreground/50` or `text-border`

`qr/page.tsx`:
- `text-gray-500` → `text-muted-foreground`
- `text-gray-400` → `text-muted-foreground`
- QR code `#000000`/`#FFFFFF` → exempt (functional requirement)

- [ ] **Step 3: Verify build and commit**

```bash
git add frontend/src/app/dashboard/menu/
git commit -m "refactor: migrate menu module colors to shadcn tokens"
```

---

## Task 11: Reports Module Migration

**Files:**
- Modify: `frontend/src/app/dashboard/reports/page.tsx`
- Modify: `frontend/src/components/reports/report-table.tsx`
- Modify: `frontend/src/components/reports/monthly-report.tsx`
- Modify: `frontend/src/components/reports/weekly-report.tsx`
- Modify: `frontend/src/components/reports/comparison-report.tsx`
- Modify: `frontend/src/components/reports/editable-cell.tsx`

- [ ] **Step 1: Read all reports files**

- [ ] **Step 2: Migrate reports/page.tsx — replace custom tabs**

Replace custom tab buttons with shadcn Tabs:
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

- [ ] **Step 3: Fix color classes in sub-components**

`report-table.tsx`:
- `text-green-700` → keep (semantic positive indicator)
- `text-red-700` → `text-destructive`
- `bg-green-50` → keep (semantic)
- `bg-red-50` → `bg-destructive/10`

`weekly-report.tsx`, `monthly-report.tsx`:
- `text-gray-500` → `text-muted-foreground`

`comparison-report.tsx`:
- Fix hardcoded recharts colors:
  - `#22c55e` (green/Gelir) → `var(--chart-2)`
  - `#ef4444` (red/Gider) → `var(--chart-1)`
  - `#f59e0b` (amber/Vergi) → `var(--chart-3)`
  - `#3b82f6` (blue/Net Kar) → `var(--chart-4)`
  - `#8b5cf6` (purple/Kar Marji) → `var(--chart-5)`
- `text-green-700`, `text-red-700`, `bg-green-50`, `bg-red-50` → same as report-table

`editable-cell.tsx`:
- `text-orange-600`, `text-orange-500` → keep (semantic edit indicator)

- [ ] **Step 4: Verify build and commit**

```bash
git add frontend/src/app/dashboard/reports/ frontend/src/components/reports/
git commit -m "refactor: migrate reports module to shadcn Tabs and tokens"
```

---

## Task 12: Simulation Module Cleanup

**Files:**
- Modify: `frontend/src/app/dashboard/simulation/page.tsx`
- Modify: `frontend/src/app/dashboard/simulation/[id]/page.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Fix colors and any remaining Material Symbols**

Both files:
- `text-gray-500` → `text-muted-foreground`
- `gray-50` → `bg-muted`
- `gray-400` → `text-muted-foreground`
- Replace any hex colors with shadcn tokens
- Replace any Material Symbols with Lucide equivalents

- [ ] **Step 3: Verify build and commit**

```bash
git add frontend/src/app/dashboard/simulation/
git commit -m "refactor: migrate simulation module colors to shadcn tokens"
```

---

## Task 13: Settings & Users Cleanup

**Files:**
- Modify: `frontend/src/app/dashboard/settings/page.tsx`
- Modify: `frontend/src/app/dashboard/users/page.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Fix color classes**

`settings/page.tsx`:
- `text-red-600` → `text-destructive`
- `text-green-600` → keep (semantic success)
- `text-yellow-600` → keep (semantic pending status)

`users/page.tsx`:
- `text-green-500` → keep (semantic success)
- `text-orange-500` → keep (semantic warning)

- [ ] **Step 3: Verify build and commit**

```bash
git add frontend/src/app/dashboard/settings/ frontend/src/app/dashboard/users/
git commit -m "refactor: migrate settings and users colors to shadcn tokens"
```

---

## Task 14: Auth Pages Cleanup

**Files:**
- Modify: `frontend/src/app/auth/login/page.tsx`
- Modify: `frontend/src/app/auth/register/page.tsx`
- Modify: `frontend/src/app/auth/callback/page.tsx`

- [ ] **Step 1: Read all auth files**

- [ ] **Step 2: Fix color classes**

`login/page.tsx`:
- `gray-50` → `bg-muted`
- `red-600` → `text-destructive`
- `red-50` → `bg-destructive/10`
- `text-blue-600` → `text-primary`
- Google brand SVG colors (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) → exempt

`register/page.tsx`:
- Same as login
- `green-600` → keep (semantic success)
- `green-50` → keep (semantic)

`callback/page.tsx`:
- `gray-500` → `text-muted-foreground`

- [ ] **Step 3: Verify build and commit**

```bash
git add frontend/src/app/auth/
git commit -m "refactor: migrate auth pages colors to shadcn tokens"
```

---

## Task 15: Admin Pages Cleanup

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`
- Modify: `frontend/src/app/admin/page.tsx`
- Modify: `frontend/src/app/admin/login/page.tsx`
- Modify: `frontend/src/app/admin/restaurants/page.tsx`
- Modify: `frontend/src/app/admin/restaurants/[id]/page.tsx`

- [ ] **Step 1: Read all admin files**

- [ ] **Step 2: Fix color classes across all files**

Replace across all files:
- `gray-900` → `text-foreground`
- `gray-800` → `text-foreground`
- `gray-700` → `text-foreground`
- `gray-400` → `text-muted-foreground`
- `gray-300` → `border`
- `gray-600` → `text-muted-foreground`
- `text-white` → `text-primary-foreground`
- `red-600` → `text-destructive`
- `red-50` → `bg-destructive/10`

- [ ] **Step 3: Verify build and commit**

```bash
git add frontend/src/app/admin/
git commit -m "refactor: migrate admin pages colors to shadcn tokens"
```

---

## Task 16: Privacy Page Migration

**Files:**
- Modify: `frontend/src/app/privacy/page.tsx`

- [ ] **Step 1: Read privacy page**

- [ ] **Step 2: Replace Material Symbols icon**

Replace `<span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>restaurant</span>` with:
```tsx
import { UtensilsCrossed } from 'lucide-react';
<UtensilsCrossed className="size-6" />
```

- [ ] **Step 3: Replace all inline hex colors with shadcn tokens**

Replace inline styles:
- `backgroundColor: '#f8fafb'` → `className="bg-background"`
- `color: '#004253'` → `className="text-primary"`
- `color: '#191c1d'` → `className="text-foreground"`
- `color: '#70787d'` → `className="text-muted-foreground"`
- `color: '#40484c'` → `className="text-muted-foreground"`
- `borderColor: '#bfc8cc'` → `className="border"`

Convert inline `style={{}}` props to Tailwind classes wherever possible.

- [ ] **Step 4: Verify build and commit**

```bash
git add frontend/src/app/privacy/
git commit -m "refactor: migrate privacy page to Lucide icons and shadcn tokens"
```

---

## Task 17: Public Menu Migration

**Files:**
- Modify: `frontend/src/app/m/[slug]/client.tsx`
- Modify: `frontend/src/app/m/[slug]/not-found.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Migrate client.tsx**

- Replace Material Symbols `restaurant` icon → `<UtensilsCrossed className="size-6" />`
- Replace `font-[Inter,sans-serif]` → `font-body`
- Replace `font-[Manrope,sans-serif]` → `font-headline`
- Replace all hex colors (`#f8fafb`, `#004253`, `#191c1d`, `#70787d`, `#40484c`, `#bfc8cc`, `#e6e8e9`, `#e1e3e4`, `#f2f4f5`, `#005b71`) → shadcn tokens

- [ ] **Step 3: Fix not-found.tsx**

- `text-gray-900` → `text-foreground`
- `text-gray-500` → `text-muted-foreground`

- [ ] **Step 4: Verify build and commit**

```bash
git add frontend/src/app/m/
git commit -m "refactor: migrate public menu to Lucide icons and shadcn tokens"
```

---

## Task 18: Dashboard Layout Cleanup

**Files:**
- Modify: `frontend/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Read dashboard layout**

- [ ] **Step 2: Fix Tailwind color classes and hex colors**

- `gray-50` → `bg-muted`
- `gray-500` → `text-muted-foreground`
- `bg-[#f8fafb]` → `bg-background`

- [ ] **Step 3: Verify build and commit**

```bash
git add frontend/src/app/dashboard/layout.tsx
git commit -m "refactor: migrate dashboard layout colors to shadcn tokens"
```

---

## Task 19: Remove Material Symbols Font Import

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Remove Google Fonts link**

Remove the `<link>` tag for Material Symbols Outlined from `<head>` (lines 29-32):
```tsx
{/* Remove this: */}
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
  rel="stylesheet"
/>
```

If `<head>` becomes empty, remove the entire `<head>` block.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "refactor: remove Material Symbols font import from layout"
```

---

## Task 20: Final Verification

**Files:** All frontend files

- [ ] **Step 1: Full build check**

Run: `cd frontend && npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 2: Grep for remaining Material Symbols**

Run: `grep -rn "material-symbols" frontend/src/`
Expected: Zero results

- [ ] **Step 3: Grep for remaining hex colors**

Run: `grep -rn "#[0-9a-fA-F]\{6\}" frontend/src/app/ frontend/src/components/` and verify only exempt colors remain (Google brand colors in auth, QR code colors in menu/qr).

- [ ] **Step 4: Grep for remaining Tailwind color classes**

Run: `grep -rn "text-teal\|text-slate\|bg-teal\|bg-slate\|border-teal\|border-slate" frontend/src/`
Expected: Zero results

Run: `grep -rn "text-gray\|bg-gray" frontend/src/`
Expected: Zero results (or only exempt semantic uses)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: shadcn/ui migration complete — all components, icons, and colors migrated"
```

- [ ] **Step 6: Push**

```bash
git push
```
