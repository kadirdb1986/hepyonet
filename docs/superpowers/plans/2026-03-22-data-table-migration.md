# DataTable Migration - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tüm projedeki tabloları @tanstack/react-table + shadcn/ui Data Table pattern ile yeniden oluşturmak — pagination, sorting, column visibility, row actions dropdown ile profesyonel bir tablo deneyimi sağlamak.

**Architecture:** Tek bir generic `DataTable<TData>` component'i oluşturulur. Her sayfa sadece column definition'larını tanımlar. DataTable tüm ortak özellikleri (pagination, sorting, filtering, column visibility) otomatik sağlar. Sayfa bazlı özel özellikler (inline edit, row ordering) column definition içinde handle edilir.

**Tech Stack:** @tanstack/react-table v8.21.3, shadcn/ui (radix-nova), Tailwind CSS v4, lucide-react

---

## Dosya Yapısı

### Yeni dosyalar (Core DataTable)

```
frontend/src/components/ui/data-table/
  data-table.tsx              → Ana generic component <DataTable<TData>>
  data-table-pagination.tsx   → Sayfa navigasyonu + sayfa boyutu seçimi
  data-table-toolbar.tsx      → Arama, filtre, column toggle, toolbar slotları
  data-table-column-header.tsx → Sortable column header
  data-table-view-options.tsx → Column visibility dropdown
```

### Değiştirilecek dosyalar (sayfa bazlı migration)

| Dosya | Mevcut Durum | DataTable Sonrası |
|-------|-------------|-------------------|
| `dashboard/products/page.tsx` | Inline table + cards | DataTable + cards |
| `dashboard/personnel/page.tsx` | Inline table | DataTable |
| `dashboard/inventory/page.tsx` | Inline table + custom pagination | DataTable |
| `dashboard/inventory/suppliers/page.tsx` | Inline table + inline edit | DataTable |
| `dashboard/inventory/movements/page.tsx` | Inline table (read-only) | DataTable |
| `dashboard/finance/expenses/page.tsx` | Inline table | DataTable |
| `dashboard/finance/revenues/page.tsx` | Inline table + inline edit | DataTable |
| `dashboard/finance/page.tsx` | Inline table | DataTable |
| `dashboard/finance/distribute/page.tsx` | 2 inline tables | DataTable + Accordion table |
| `dashboard/menu/page.tsx` | Inline table + ordering | DataTable |
| `dashboard/users/page.tsx` | Inline table | DataTable |
| `dashboard/simulation/page.tsx` | 3 tab tables | DataTable per tab |
| `dashboard/products/categories/page.tsx` | Inline table + ordering | DataTable |
| `dashboard/personnel/positions/page.tsx` | Inline table | DataTable |
| `dashboard/personnel/[id]/page.tsx` | Leave records table | DataTable |
| `admin/restaurants/page.tsx` | Inline table | DataTable |

---

### Task 1: Core DataTable — Column Header

**Files:**
- Create: `frontend/src/components/ui/data-table/data-table-column-header.tsx`

- [ ] **Step 1: Oluştur**

```tsx
"use client"

import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Artan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Azalan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Gizle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/data-table/data-table-column-header.tsx
git commit -m "feat: add DataTable column header component"
```

---

### Task 2: Core DataTable — Pagination

**Files:**
- Create: `frontend/src/components/ui/data-table/data-table-pagination.tsx`

- [ ] **Step 1: Oluştur**

```tsx
"use client"

import { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} / {table.getFilteredRowModel().rows.length} satır seçildi
          </span>
        )}
        {table.getFilteredSelectedRowModel().rows.length === 0 && (
          <span>
            Toplam {table.getFilteredRowModel().rows.length} kayıt
          </span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Sayfa başı</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Sayfa {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">İlk sayfa</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Önceki sayfa</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Sonraki sayfa</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Son sayfa</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/data-table/data-table-pagination.tsx
git commit -m "feat: add DataTable pagination component"
```

---

### Task 3: Core DataTable — View Options (Column Visibility)

**Files:**
- Create: `frontend/src/components/ui/data-table/data-table-view-options.tsx`

- [ ] **Step 1: Oluştur**

```tsx
"use client"

import { Table } from "@tanstack/react-table"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Kolonlar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Görünür Kolonlar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.columnDef.meta?.label ?? column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/data-table/data-table-view-options.tsx
git commit -m "feat: add DataTable view options component"
```

---

### Task 4: Core DataTable — Toolbar

**Files:**
- Create: `frontend/src/components/ui/data-table/data-table-toolbar.tsx`

- [ ] **Step 1: Oluştur**

```tsx
"use client"

import { Table } from "@tanstack/react-table"
import { X, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  children?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Ara...",
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 ||
    table.getState().globalFilter

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="h-9 w-[200px] lg:w-[300px] pl-8"
            />
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={table.getState().globalFilter ?? ""}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className="h-9 w-[200px] lg:w-[300px] pl-8"
            />
          </div>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter("")
            }}
            className="h-8 px-2 lg:px-3"
          >
            Temizle
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
        {children}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/data-table/data-table-toolbar.tsx
git commit -m "feat: add DataTable toolbar component"
```

---

### Task 5: Core DataTable — Ana Component

**Files:**
- Create: `frontend/src/components/ui/data-table/data-table.tsx`
- Create: `frontend/src/components/ui/data-table/index.ts`

- [ ] **Step 1: Ana component'i oluştur**

```tsx
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  GlobalFilterFn,
  FilterFn,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"

// TanStack meta tipi genişletmesi
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends unknown, TValue> {
    label?: string
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  showPagination?: boolean
  showToolbar?: boolean
  pageSize?: number
  toolbarChildren?: React.ReactNode
  emptyMessage?: string
  isLoading?: boolean
  onRowClick?: (row: TData) => void
  initialColumnVisibility?: VisibilityState
  globalFilterFn?: FilterFn<TData>
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  showPagination = true,
  showToolbar = true,
  pageSize = 20,
  toolbarChildren,
  emptyMessage = "Kayıt bulunamadı.",
  isLoading = false,
  onRowClick,
  initialColumnVisibility = {},
  globalFilterFn,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: showPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalFilterFn ?? "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  return (
    <div className="space-y-4">
      {showToolbar && (
        <DataTableToolbar
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
        >
          {toolbarChildren}
        </DataTableToolbar>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && <DataTablePagination table={table} />}
    </div>
  )
}
```

- [ ] **Step 2: Index dosyasını oluştur**

```tsx
export { DataTable } from "./data-table"
export { DataTableColumnHeader } from "./data-table-column-header"
export { DataTablePagination } from "./data-table-pagination"
export { DataTableToolbar } from "./data-table-toolbar"
export { DataTableViewOptions } from "./data-table-view-options"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/data-table/
git commit -m "feat: add core DataTable component with pagination, sorting, filtering"
```

---

### Task 6: Personel Listesi → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/personnel/page.tsx`

Bu en temiz migration örneği — düz liste, arama, row actions.

- [ ] **Step 1: Dosyayı oku ve mevcut yapıyı anla**
- [ ] **Step 2: Imports'u güncelle** — Eski Table import'larını kaldır, DataTable ve ColumnDef ekle
- [ ] **Step 3: Column definitions oluştur**

```tsx
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

const columns: ColumnDef<Personnel>[] = [
  {
    accessorFn: (row) => `${row.name} ${row.surname}`,
    id: "fullName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ad Soyad" />,
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name} {row.original.surname}</div>
    ),
    meta: { label: "Ad Soyad" },
  },
  {
    accessorKey: "position",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Pozisyon" />,
    meta: { label: "Pozisyon" },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Telefon" />,
    meta: { label: "Telefon" },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Başlangıç" />,
    cell: ({ row }) => formatDate(row.original.startDate),
    meta: { label: "Başlangıç" },
  },
  {
    accessorKey: "salary",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Maaş" className="text-right" />,
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(Number(row.original.salary))} TL</div>,
    meta: { label: "Maaş" },
  },
  {
    id: "status",
    header: "Durum",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Aktif" : "Pasif"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const p = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/personnel/${p.id}`}>Görüntüle</Link>
            </DropdownMenuItem>
            {p.isActive ? (
              <DropdownMenuItem onClick={() => setDeactivateId(p.id)} className="text-destructive">
                Pasife Al
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => activateMutation.mutate(p.id)}>Aktife Al</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(p.id, `${p.name} ${p.surname}`)} className="text-destructive">Sil</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

- [ ] **Step 4: JSX'i güncelle** — Mevcut Card > Table yapısını Card > DataTable ile değiştir

```tsx
<Card>
  <CardHeader>
    <CardTitle>Personel Listesi</CardTitle>
  </CardHeader>
  <CardContent>
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="İsim, pozisyon veya telefon ara..."
      isLoading={isLoading}
    />
  </CardContent>
</Card>
```

- [ ] **Step 5: Eski state'leri temizle** — `search` state'ini kaldır (DataTable kendi global filter'ını kullanacak), `filtered` hesaplamasını kaldır (DataTable filtering yapacak)
- [ ] **Step 6: globalFilterFn ekle** — isim, pozisyon, telefon alanlarında arama yapması için custom filter fonksiyonu tanımla
- [ ] **Step 7: Test et** — `/dashboard/personnel` sayfasını aç, sorting, pagination, column visibility, search, row actions test et
- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/dashboard/personnel/page.tsx
git commit -m "refactor: migrate personnel list to DataTable"
```

---

### Task 7: Ürünler Listesi → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/products/page.tsx`

**Not:** Bu sayfada 2 bölüm var — Menü Ürünleri (tablo) ve Ara Ürünler (card grid). Sadece Menü Ürünleri tablosu DataTable'a dönüştürülecek, card grid aynen kalacak.

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions oluştur** — 8 kolon: Ürün Adı (avatar+isim), Kod, Kategori (Badge), Satış Fiyatı, Maliyet, Kar Marjı (conditional styling), Tip (Badge), Actions (DropdownMenu)
- [ ] **Step 3: Menü Ürünleri bölümünü DataTable ile değiştir**
- [ ] **Step 4: Eski Table import'larını temizle** (eğer başka yerde kullanılmıyorsa)
- [ ] **Step 5: Test et ve commit**

```bash
git commit -m "refactor: migrate products list to DataTable"
```

---

### Task 8: Stok (Envanter) → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/page.tsx`

**Not:** Bu sayfa zaten column visibility + pagination + filtering içeriyor. DataTable'a geçişte mevcut custom pagination ve column toggle kodu kaldırılacak.

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions oluştur** — Name (avatar+isim+tip), Tip (Badge), Tedarikçi (Popover), Mevcut Stok (progress bar), Min Stok, Son Alış Fiyatı, Stok Durumu (Badge), Actions (DropdownMenu)
- [ ] **Step 3: Mevcut custom pagination, column visibility state, useEffect kaldır** — DataTable bunları otomatik sağlayacak
- [ ] **Step 4: initialColumnVisibility prop'unu kullan** — DEFAULT_VISIBLE_COLUMNS'ı VisibilityState formatına dönüştür
- [ ] **Step 5: Tab filtreleme'yi toolbarChildren olarak ekle**
- [ ] **Step 6: globalFilterFn ekle** — Türkçe locale destekli arama
- [ ] **Step 7: Test et ve commit**

```bash
git commit -m "refactor: migrate inventory list to DataTable"
```

---

### Task 9: Tedarikciler → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/suppliers/page.tsx`

**Not:** Inline editing var. Inline edit state'leri korunacak, sadece tablo yapısı DataTable'a geçecek. Edit modunda olan satır özel cell render'ları kullanacak.

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions oluştur** — editingSupplier state'ine göre conditional cell render (normal görünüm vs edit input)
- [ ] **Step 3: DataTable ile değiştir**
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate suppliers list to DataTable"
```

---

### Task 10: Stok Hareketleri → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/movements/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Tarih, Ad, Tür (Badge IN/OUT), Miktar, Birim Fiyat, Toplam Değer, Tedarikçi, Fatura No
- [ ] **Step 3: DataTable ile değiştir** — read-only tablo, row actions yok
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate stock movements to DataTable"
```

---

### Task 11: Giderler → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/finance/expenses/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Başlık, Kategori (Badge), Tutar, Ödeme Tarihi, Dönem (Badge), Actions (DropdownMenu: Düzenle, Sil)
- [ ] **Step 3: Ay filtresi ve kategori filtresi'ni toolbarChildren olarak ekle**
- [ ] **Step 4: DataTable ile değiştir**
- [ ] **Step 5: Test et ve commit**

```bash
git commit -m "refactor: migrate expenses list to DataTable"
```

---

### Task 12: Ciro Kayıtları → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/finance/revenues/page.tsx`

**Not:** Inline editing var (tutara tıkla, düzenle). Cell renderer'da editing state'e göre Input veya text gösterilecek.

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Gün, Tarih, Tutar (inline editable cell)
- [ ] **Step 3: showPagination=false** — 31 gün için pagination gereksiz
- [ ] **Step 4: Hafta sonu satırları için conditional row className** — onRowClick yerine cell-level onClick
- [ ] **Step 5: TableFooter'ı DataTable dışında ayrı render et** (toplam satırı)
- [ ] **Step 6: Test et ve commit**

```bash
git commit -m "refactor: migrate revenue records to DataTable"
```

---

### Task 13: Finans Özet → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/finance/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Tarih (gün+gün adı), Ciro, Gider, Net Durum (dot+rakam), Detay (link)
- [ ] **Step 3: showPagination=false, showToolbar=false** — bu tablo ay bazlı özet
- [ ] **Step 4: Ay navigasyonunu tablo dışında bırak** (mevcut yerinde)
- [ ] **Step 5: Test et ve commit**

```bash
git commit -m "refactor: migrate finance overview table to DataTable"
```

---

### Task 14: Gider Dağıtım → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/finance/distribute/page.tsx`

**Not:** 2 tablo var. Dağıtılmamış giderler tablosu DataTable olacak. Accordion içindeki dağıtım detay tablosu küçük olduğu için basit Table kalabilir.

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Dağıtılmamış giderler tablosu için column definitions** — Başlık, Kategori, Tutar, Ödeme Tarihi, İşlem (Dağıt butonu)
- [ ] **Step 3: DataTable ile değiştir** — showPagination=false (genellikle az sayıda kayıt)
- [ ] **Step 4: Accordion içi tablo aynen kalacak**
- [ ] **Step 5: Test et ve commit**

```bash
git commit -m "refactor: migrate distribute expenses to DataTable"
```

---

### Task 15: Menü Yönetimi → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/menu/page.tsx`

**Not:** Sıralama (up/down) ve availability toggle var. Column definitions'da bu özellikler cell renderer olarak tanımlanacak.

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Sıra, Ürün (image+isim), Kod (Badge), Kategori (Badge), Fiyat, Uygunluk (Switch), Sırala (up/down buttons)
- [ ] **Step 3: DataTable ile değiştir** — showPagination=false
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate menu management to DataTable"
```

---

### Task 16: Kullanıcılar → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/users/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Ad Soyad, E-posta, Rol (Badge veya Select), Durum (Badge), Actions (DropdownMenu)
- [ ] **Step 3: DataTable ile değiştir**
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate users list to DataTable"
```

---

### Task 17: Simülasyon → DataTable (3 Tab)

**Files:**
- Modify: `frontend/src/app/dashboard/simulation/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Her tab için ayrı column definitions** — Simulations, Fixed Expenses (inline edit), Fixed Revenues
- [ ] **Step 3: Her tab'daki tabloyu DataTable ile değiştir** — showPagination=false
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate simulation tables to DataTable"
```

---

### Task 18: Ürün Kategorileri → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/products/categories/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Sıra, Kategori Adı, Ürün Sayısı, Sırala (up/down), Actions (DropdownMenu: Düzenle, Sil)
- [ ] **Step 3: DataTable ile değiştir** — showPagination=false
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate product categories to DataTable"
```

---

### Task 19: Personel Pozisyonları → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/personnel/positions/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Pozisyon Adı, Actions (Sil)
- [ ] **Step 3: DataTable ile değiştir** — showPagination=false, showToolbar=false
- [ ] **Step 4: Test et ve commit**

```bash
git commit -m "refactor: migrate personnel positions to DataTable"
```

---

### Task 20: Personel Detay — İzin Kayıtları → DataTable

**Files:**
- Modify: `frontend/src/app/dashboard/personnel/[id]/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: İzin kayıtları tablosu için column definitions** — Başlangıç, Bitiş, İzin Türü (Badge), Durum (Badge), Notlar, Actions (Onayla/Reddet)
- [ ] **Step 3: Leave records tablosunu DataTable ile değiştir** — showPagination=false
- [ ] **Step 4: Diğer card'lar (personel bilgileri, iş günleri) aynen kalacak**
- [ ] **Step 5: Test et ve commit**

```bash
git commit -m "refactor: migrate personnel leave records to DataTable"
```

---

### Task 21: Admin Restoranlar → DataTable

**Files:**
- Modify: `frontend/src/app/admin/restaurants/page.tsx`

- [ ] **Step 1: Dosyayı oku**
- [ ] **Step 2: Column definitions** — Restoran, Yönetici (isim+email), Durum (Badge), Kayıt Tarihi, Actions (conditional: Onayla/Reddet)
- [ ] **Step 3: Status filter'ı toolbarChildren olarak ekle**
- [ ] **Step 4: DataTable ile değiştir** — onRowClick ile detay sayfasına navigate
- [ ] **Step 5: Test et ve commit**

```bash
git commit -m "refactor: migrate admin restaurants to DataTable"
```

---

## Toplam Özet

| Metrik | Sayı |
|--------|------|
| Yeni dosya (core) | 6 |
| Değiştirilecek sayfa | 16 |
| Toplam task | 21 |
| Core task (1-5) | 5 |
| Migration task (6-21) | 16 |

**Task bağımlılıkları:** Task 1-5 (core) sıralı yapılmalı. Task 6-21 (migration) birbirinden bağımsız, ancak hepsi Task 5'e bağımlı.

**Öneri:** Task 1-5'i sıralı, Task 6'yı pilot olarak yap ve doğrula. Sonra Task 7-21'i paralel dispatch et.
