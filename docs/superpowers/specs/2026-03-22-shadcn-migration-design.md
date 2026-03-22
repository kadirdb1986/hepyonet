# shadcn/ui Migration Design Spec

**Date:** 2026-03-22
**Scope:** Full frontend migration to shadcn/ui component system

## Overview

Migrate the HepYonet frontend from mixed custom styling + partial shadcn usage to a fully shadcn/ui-based component system. All hardcoded colors, Material Symbols icons, and custom HTML elements will be replaced with shadcn components, Lucide icons, and shadcn CSS variable tokens.

## Approach

**Layout-First Migration** — fix the foundation (theme + layout), then migrate pages module by module.

## Migration Order

### Phase 1: Foundation

1. **globals.css cleanup**
   - Remove all `--color-ds-*` custom design system variables from `@theme inline`
   - Remove custom color variables from `:root` (`--color-primary: #004253`, `--color-surface`, etc.) — note: these duplicate the `@theme inline` block, both must be cleaned
   - Keep only shadcn oklch variables + font definitions (`--font-headline`, `--font-body`)
   - Remove `.material-symbols-outlined` CSS rule
   - Remove `background-color: var(--color-surface)` and `color: var(--color-on-surface)` from body — the existing `@apply font-body bg-background text-foreground` on the same element is sufficient

2. **Layout components (Sidebar + Header)**
   - **Sidebar (~179 lines, 13 Material Symbols):**
     - Replace all Material Symbols with Lucide equivalents
     - Replace custom NavItem with shadcn `Button` variant="ghost"
     - Replace hardcoded colors and Tailwind color classes (`text-teal-900`, `border-teal-900`, `bg-slate-100` etc.) with shadcn sidebar tokens (`bg-sidebar`, `text-sidebar-foreground`)
     - Replace custom active state with shadcn-compatible styling
   - **Header (~125 lines, 3 Material Symbols):**
     - Replace `menu`/`search`/`notifications` icons with Lucide `Menu`/`Search`/`Bell`
     - Already uses shadcn DropdownMenu — fix remaining hardcoded colors and Tailwind color classes (`text-teal-800`, `bg-slate-50`, `hover:bg-slate-200` etc.)
   - **layout.tsx:**
     - Remove Material Symbols Google Fonts `<link>` (after all icons migrated)

### Phase 2: Heavy Migration Pages

3. **Dashboard (main panel, ~250 lines, 6 Material Symbols)**
   - Custom bento grid cards → shadcn `Card` components
   - Custom buttons → shadcn `Button`
   - Material Symbols → Lucide icons
   - Hardcoded colors (#004253 etc.) → shadcn tokens (`bg-primary`, `text-muted-foreground`)
   - Custom badge → shadcn `Badge`

4. **Products (~485 lines, 8 Material Symbols)**
   - Custom table → shadcn `Table`
   - Custom search input → shadcn `Input`
   - Material Symbols → Lucide
   - Hardcoded colors → shadcn tokens
   - Custom dialog → shadcn `Dialog`
   - Custom buttons → shadcn `Button`
   - **Sub-pages:** `products/new`, `products/[id]`, `products/categories` — review and fix colors/icons

5. **Inventory (~988 lines, 14 Material Symbols)**
   - Custom SupplierPopover → shadcn `Popover`
   - Custom column visibility toggle → shadcn `DropdownMenu` + `Checkbox`
   - Hardcoded colors → shadcn tokens
   - Fix partially-shadcn form fields
   - **Sub-pages:** `inventory/movements`, `inventory/suppliers` — review and fix colors/icons

6. **Finance (~623 lines, 14 Material Symbols)**
   - Custom SVG DonutChart → `recharts` (already in dependencies)
   - Custom buttons → shadcn `Button`
   - Hardcoded colors → shadcn chart tokens (see Recharts Color Strategy below)
   - **Sub-pages:** `finance/revenues`, `finance/expenses`, `finance/distribute` — review and fix colors/icons

### Phase 3: Light Migration Pages

7. **Personnel (~260 lines, 0 Material Symbols)**
   - Already uses shadcn + Lucide icons — fix remaining Tailwind color classes (`text-gray-500`, `bg-gray-50` etc.)
   - **Sub-pages:** `personnel/new`, `personnel/[id]`, `personnel/positions` — review and fix colors

8. **Menu (~150 lines)**
   - Already well-structured with shadcn — minimal cleanup
   - **Sub-pages:** `menu/qr` — QR code colors (#000000/#FFFFFF) are exempt (see Exemptions)

9. **Reports (~38 lines + 4 sub-components)**
   - Custom tab buttons → shadcn `Tabs`
   - **Sub-components:** `report-table.tsx`, `monthly-report.tsx`, `weekly-report.tsx`, `comparison-report.tsx`
   - Fix Tailwind color classes (`text-green-700`, `text-red-700`, `bg-green-50`, `bg-red-50`)
   - Fix hardcoded recharts colors in comparison-report.tsx (see Recharts Color Strategy)

10. **Simulation (~100+ lines)**
    - Already uses shadcn components — icon/color cleanup
    - **Sub-pages:** `simulation/[id]`

11. **Settings (~100 lines)**
    - Already uses shadcn — minimal cleanup

12. **Users (~150+ lines)**
    - Already uses shadcn — minimal cleanup

### Phase 4: Other Pages

13. **Auth pages (Login ~120 lines, Register ~145 lines)**
    - Already good shadcn usage — fix Tailwind color classes (`text-gray-500` etc.)
    - Google brand SVG colors are exempt (see Exemptions)
    - **Sub-pages:** `auth/callback` — review

14. **Admin (~50 lines)**
    - shadcn Card already used — minor cleanup
    - **Sub-pages:** `admin/login`, `admin/restaurants`, `admin/restaurants/[id]`

15. **Privacy (~120+ lines)**
    - No shadcn components — full migration needed
    - Remove Material Symbols icon
    - Apply shadcn typography and layout

16. **Public Menu (`/m/[slug]`, client.tsx ~240 lines, 1 Material Symbols)**
    - Replace Material Symbols `restaurant` icon with Lucide
    - Replace inline `font-[Inter,sans-serif]` / `font-[Manrope,sans-serif]` with `font-body` / `font-headline` utilities
    - Hardcoded colors → shadcn tokens
    - **Sub-pages:** `m/[slug]/not-found.tsx` — fix `text-gray-900`, `text-gray-500`

## Icon Mapping (Material Symbols → Lucide)

| Material Symbols | Lucide | Usage |
|-----------------|--------|-------|
| `dashboard` | `LayoutDashboard` | Sidebar |
| `group` | `Users` | Sidebar, Dashboard |
| `payments` | `CreditCard` | Sidebar |
| `inventory_2` | `Package` | Sidebar |
| `restaurant_menu` / `fastfood` | `UtensilsCrossed` | Sidebar (Products) |
| `menu_book` | `BookOpen` | Sidebar |
| `analytics` / `assessment` | `BarChart3` | Sidebar (Reports) |
| `science` | `FlaskConical` | Sidebar |
| `settings` | `Settings` | Sidebar |
| `manage_accounts` | `UserCog` | Sidebar |
| `menu` | `Menu` | Header, Sidebar |
| `search` | `Search` | Header |
| `notifications` | `Bell` | Header |
| `restaurant` | `UtensilsCrossed` | Sidebar, Privacy, Public Menu |
| `calendar_today` | `Calendar` | Dashboard |
| `add` | `Plus` | Dashboard, Products |
| `trending_up` | `TrendingUp` | Dashboard |
| `trending_down` | `TrendingDown` | Finance |
| `account_balance_wallet` | `Wallet` | Dashboard |
| `chevron_right` | `ChevronRight` | Products |
| `category` | `Tag` | Products |
| `reorder` | `GripVertical` | Products |
| `edit` | `Pencil` | Products |
| `delete` | `Trash2` | Products |
| `add_circle` | `PlusCircle` | Products |
| `attach_money` | `DollarSign` | Finance |
| `local_shipping` | `Truck` | Inventory |
| `tune` | `SlidersHorizontal` | Inventory |
| `file_download` | `Download` | Inventory |
| `warning` | `AlertTriangle` | Inventory |
| `upload` | `Upload` | Finance |
| `filter_list` | `Filter` | Finance |
| `receipt_long` | `Receipt` | Finance |
| `point_of_sale` | `Monitor` | Finance |
| `request_quote` | `FileText` | Finance |

## Color Migration

### Hardcoded Hex Colors → shadcn Tokens

| Hardcoded | shadcn Token |
|-----------|-------------|
| `#004253` (primary) | `bg-primary` / `text-primary` |
| `#005b71` (primary container) | `bg-primary/80` or `bg-accent` |
| `#ffffff` (on-primary) | `text-primary-foreground` |
| `#f8fafb` (surface) | `bg-background` |
| `#f2f4f5` (surface-container-low) | `bg-muted` |
| `#eceeef` (surface-container) | `bg-muted` |
| `#e6e8e9` (surface-container-high) | `bg-muted` |
| `#191c1d` (on-surface) | `text-foreground` |
| `#40484c` (on-surface-variant) | `text-muted-foreground` |
| `#70787d` (outline) | `text-muted-foreground` / `border` |
| `#bfc8cc` (outline-variant) | `border` |
| `#ba1a1a` (error) | `text-destructive` / `bg-destructive` |
| `#ffdad6` (error-container) | `bg-destructive/10` |
| `#d4e6e9` (secondary-container) | `bg-secondary` |

### Tailwind Color Classes → shadcn Tokens

| Tailwind Class | shadcn Token |
|---------------|-------------|
| `text-teal-900`, `text-teal-800` | `text-primary` |
| `border-teal-900` | `border-primary` |
| `bg-slate-100`, `bg-slate-50` | `bg-muted` |
| `text-slate-500`, `text-slate-600` | `text-muted-foreground` |
| `hover:bg-slate-200` | `hover:bg-muted` |
| `text-gray-500`, `text-gray-600` | `text-muted-foreground` |
| `text-gray-900` | `text-foreground` |
| `bg-gray-50` | `bg-muted` |
| `text-red-500`, `text-red-600`, `text-red-700` | `text-destructive` |
| `bg-red-50` | `bg-destructive/10` |
| `text-green-500`, `text-green-700` | `text-green-600` (semantic, see Exemptions) |
| `bg-green-50` | `bg-green-50` (semantic, see Exemptions) |

## Recharts Color Strategy

Recharts components accept color values via props (`fill`, `stroke`), not CSS classes. Since shadcn's radix-nova preset uses oklch (not hsl), use `var(--chart-N)` directly without an `hsl()` wrapper:

```tsx
// Instead of hardcoded colors:
const COLORS = ['#004253', '#005b71', '#ba1a1a', '#bfc8cc'];

// Use CSS variables directly (oklch values):
const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
```

## Exemptions

These hardcoded colors are **intentionally kept** and excluded from migration:

1. **Google brand SVG colors** in auth pages (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) — brand-mandated
2. **QR code colors** in `menu/qr` (`#000000`, `#FFFFFF`) — functional requirement for scanning
3. **Semantic success/warning colors** — `text-green-600`, `bg-green-50` for positive indicators in reports/finance may be kept if shadcn does not have a built-in success token

## Fonts

Keep current font setup:
- **Geist** — `--font-sans` (shadcn default)
- **Inter** — `--font-body` (body text)
- **Manrope** — `--font-headline` (headings)

Remove: Material Symbols Outlined Google Fonts import

## What's NOT Changing

- Business logic and data fetching (React Query, Zustand, API calls)
- Routing structure
- Supabase integration
- i18n setup (next-intl stays as-is)
- Form validation (react-hook-form + zod)
- Turkish UI text (stays hardcoded — i18n is a separate initiative)

## Success Criteria

- Zero Material Symbols icons remaining
- Zero hardcoded hex colors in component files (except Exemptions above)
- Zero Tailwind built-in color classes (teal-*, slate-*, gray-* etc.) except exempted cases
- All interactive elements use shadcn components
- All colors reference shadcn CSS variables via Tailwind utilities
- `globals.css` contains only shadcn theme variables + font definitions
- Build passes with no errors
