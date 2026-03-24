import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—"
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

export function formatPhone(phone: string | number | null | undefined): string {
  if (phone == null) return "—"
  const digits = String(phone).replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("0")) {
    return `0 (${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }
  if (digits.length === 10) {
    return `0 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  return phone
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

export function handleNumericInput(value: string, setter: (v: string) => void) {
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
