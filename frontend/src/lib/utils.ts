import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sayısal input için onChange handler'ı.
 * Virgül ve nokta'yı kabul eder, değeri string olarak tutar.
 * Sadece geçerli sayısal karakterlere izin verir.
 */
export function handleNumericInput(value: string): string {
  // Virgülü noktaya çevir (iç temsil için)
  let v = value.replace(',', '.');
  // Sadece rakam, nokta ve başta eksi işaretine izin ver
  v = v.replace(/[^0-9.\-]/g, '');
  // Birden fazla noktayı engelle
  const parts = v.split('.');
  if (parts.length > 2) {
    v = parts[0] + '.' + parts.slice(1).join('');
  }
  return v;
}

/**
 * Sayısal değeri Türkçe formatta göster (nokta yerine virgül).
 * Input value olarak kullanılır.
 */
export function displayNumericValue(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';
  return String(value).replace('.', ',');
}

/**
 * String değeri number'a çevir (submit için).
 * Virgülü noktaya çevirip parseFloat yapar.
 */
export function parseNumericValue(value: string | number): number {
  if (value === '' || value === null || value === undefined) return 0;
  const str = String(value).replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
