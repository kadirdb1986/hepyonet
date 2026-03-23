# HepYonet - Restoran Yönetim Platformu

## Proje Yapısı
- frontend/ → Next.js (shadcn/ui kurulu)
- backend/ → API
- CLAUDE.md bu dosya kök dizinde

## Tech Stack (frontend)
- Framework: Next.js 15 (App Router)
- UI: shadcn/ui (Nova preset, Radix, Lucide ikonlar)
- Font: Manrope (başlıklar) + Inter (body) — Google Fonts
- Stil: Tailwind CSS v4
- DB: Supabase (proje: phumnskfqmksrddsyihc)
- Form: react-hook-form + zod
- Tablo: @tanstack/react-table
- Grafik: shadcn/ui charts
- Tarih: date-fns
- Toast: sonner (toast deprecated)

## Modüller
- Panel (dashboard)
- Personel (HR)
- Finans (ciro, giderler)
- Stok
- Ürünler
- Menü
- Simülasyon
- Raporlar

## Kurallar
- Her zaman shadcn/ui componentlerini kullan
- Yeni paket kurma, mevcut paketlerle çöz
- Formlar için her zaman zod schema kullan
- Türkçe UI, İngilizce kod
- Toast yerine sonner kullan
- Supabase RLS aktif, her sorgu auth kontrollü
- Dosya ve değişken isimleri İngilizce
- Component başına tek dosya
- İkon: Google Material Symbols (Outlined, 24px) — Google Fonts CSS ile yüklenir
- Frontend kodu: frontend/ klasöründe
- Backend kodu: backend/ klasöründe
- Backend'e dokunmadan önce bana sor
