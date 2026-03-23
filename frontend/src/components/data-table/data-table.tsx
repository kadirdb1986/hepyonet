"use client"

import { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchKey?: string
  pageSize?: number
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Ara...",
  searchKey,
  pageSize = 10,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
  })

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(25,28,30,0.06)] overflow-hidden">
      {/* Toolbar */}
      <div className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-outline-variant/15">
        <div className="flex items-center gap-3 flex-1">
          {searchKey !== undefined && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
              <input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 pr-4 py-2 bg-surface-container-low border-0 text-sm rounded-lg w-64 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-outline/50"
                placeholder={searchPlaceholder}
              />
            </div>
          )}
        </div>
        {toolbar}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-surface-container-low">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && <span className="material-symbols-outlined text-[14px]">arrow_upward</span>}
                      {header.column.getIsSorted() === "desc" && <span className="material-symbols-outlined text-[14px]">arrow_downward</span>}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-bright transition-colors group">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-on-surface-variant">
                  Veri bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-outline-variant/15">
        <p className="text-sm text-on-surface-variant font-medium">
          {table.getFilteredRowModel().rows.length} kayıttan{" "}
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          arası gösteriliyor
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-xl">first_page</span>
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => {
            const pageIndex = table.getState().pagination.pageIndex
            let start = Math.max(0, pageIndex - 2)
            const end = Math.min(start + 5, table.getPageCount())
            start = Math.max(0, end - 5)
            const page = start + i
            if (page >= table.getPageCount()) return null
            return (
              <button
                key={page}
                onClick={() => table.setPageIndex(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  page === pageIndex
                    ? "bg-primary text-on-primary font-bold"
                    : "hover:bg-surface-container-low text-on-surface"
                }`}
              >
                {page + 1}
              </button>
            )
          })}
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-xl">last_page</span>
          </button>
        </div>
      </div>
    </div>
  )
}
