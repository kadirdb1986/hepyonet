# Frontend Rebuild Design Spec

## Overview

HepYonet frontend'inin Stitch design system'ine ("The Culinary Architect") uygun olarak sifirdan yeniden kodlanmasi. Multi-tenant SaaS restoran yonetim platformu. Turkce arayuz, responsive.

## Kararlar

| Karar | Secim | Gerekce |
|-------|-------|---------|
| UI Library | shadcn/ui (Stitch renk override) | Component altyapisi saglar, CLAUDE.md uyumu |
| Ikonlar | Google Material Symbols (Outlined, 24px) | Stitch tasarimlarina uyum — Google Fonts CSS ile yuklenir (npm paketi yok) |
| Fontlar | Manrope (basliklar) + Inter (body) | Stitch design system |
| Renkler | Stitch 43+ custom token palette | Kullanici karari |
| Grafikler | shadcn/ui charts | Zaten Recharts uzerine kurulu, ayri paket gereksiz |
| Modul sirasi | Auth > Layout > Panel > Personel > Finans > Stok > Urunler > Menu > Simulasyon > Raporlar > Ayarlar > Kullanicilar > Admin > Privacy | Kullanici karari |

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4, Stitch renk token'lari
- **Fonts:** Manrope + Inter (Google Fonts CSS link ile yuklenir)
- **Icons:** Google Material Symbols Outlined (Google Fonts CSS link ile yuklenir, npm paketi yok — CLAUDE.md "yeni paket kurma" kuralina istisna degil)
- **Components:** shadcn/ui (renk override)
- **Charts:** shadcn/ui charts (recharts uzerine kurulu)
- **State:** Zustand (auth store)
- **Server State:** TanStack React Query (@tanstack/react-query)
- **Tables:** TanStack React Table (@tanstack/react-table) — DataTable component
- **Forms:** react-hook-form + zod
- **Toast:** sonner
- **Date:** date-fns
- **QR:** qrcode.react (render icin). html5-qrcode bu rebuild'de kullanilmayacak.
- **API Client:** axios
- **Supabase:** @supabase/supabase-js — sadece OAuth callback icin (Google login). Tum diger islemler NestJS backend uzerinden.

### Dahil Edilmeyen Paketler (Eski Frontend'den)

| Paket | Durum | Neden |
|-------|-------|-------|
| lucide-react | Cikarildi | Google Material Symbols ile degistirildi |
| recharts | Cikarildi | shadcn/ui charts zaten recharts icerir |
| xlsx | Ertelendi | Prompt'ta Excel export tanimlanmamis |
| motion | Ertelendi | Temel animasyonlar CSS transitions ile saglanacak |
| html5-qrcode | Cikarildi | QR scanner sayfasi yok |
| next-intl | Cikarildi | Statik Turkce string'ler yeterli, tr.json sabit sabitler dosyasi olarak kullanilacak |

## Stitch Design System

### Renk Paleti (CSS Custom Properties — Tam Liste)

```
--primary: #000000              (Black Label - premium)
--on-primary: #ffffff
--primary-container: #dbe1ff
--on-primary-container: #00164e
--primary-fixed: #dbe1ff
--primary-fixed-dim: #b4c5ff

--secondary: #006e2d            (Healthy margins green)
--on-secondary: #ffffff
--secondary-container: #7cf994  (Profit Glow gradient end)
--on-secondary-container: #002109
--secondary-fixed: #7ffc97
--secondary-fixed-dim: #62df7d

--tertiary: #000000
--on-tertiary: #ffffff
--tertiary-container: #ffddb8
--on-tertiary-container: #2a1700
--tertiary-fixed: #ffddb8       (Warm hospitality accents)
--tertiary-fixed-dim: #ffb95f

--error: #ba1a1a                (Kitchen-stoppage critical)
--on-error: #ffffff
--error-container: #ffdad6      (Soft warnings)
--on-error-container: #410002

--surface: #f7f9fb              (Base canvas)
--surface-dim: #d8dadc
--surface-bright: #f7f9fb
--surface-container-lowest: #ffffff (Primary workspace — focal point)
--surface-container-low: #f2f4f6   (Secondary sidebars)
--surface-container: #eceef0       (Mid-level)
--surface-container-high: #e6e8ea
--surface-container-highest: #e0e3e5 (Active states)
--surface-tint: #0053db            (Input focus ghost border)

--on-surface: #191c1e           (Primary text)
--on-surface-variant: #45464d   (Muted metadata)
--outline: #76777d
--outline-variant: #c6c6cd      (Ghost borders @ 15% opacity)

--inverse-surface: #2e3133
--inverse-on-surface: #eff1f3
--inverse-primary: #b4c5ff
```

### Temel Kurallar

1. **No-Border Rule:** 1px solid border yasak. Ayrim background shift + negative space ile saglanir. Zorunlu hallerde outline-variant @ 15% opacity.
2. **Tonal Layering:** surface > surface-container-low > surface-container > surface-container-high > surface-container-highest sirasiyla derinlik.
3. **Glassmorphism:** Floating modal/dialog'larda surface-container-lowest @ 80% opacity + 20px backdrop-blur.
4. **Shadow:** Sadece floating elementlerde: `0 20px 40px rgba(25, 28, 30, 0.06)`.
5. **Butonlar:** Primary = siyah (#000), Secondary = surface-container-highest, rounded-md (0.375rem).
6. **Input:** Default bg = surface-container-low, Focus bg = surface-container-lowest + surface-tint (#0053db) @ 20% ghost border.
7. **Tablolar:** Dikey cizgi yok, surface-container-low header, 1rem vertical padding, hover = surface-bright.
8. **Tipografi:** Basliklar = Manrope on-surface, Metadata/label = Inter on-surface-variant.
9. **Spacing:** Top-level section margins 5rem-6rem, editorial gallery hissi.
10. **Profit Glow:** 45deg gradient secondary (#006e2d) > secondary-container (#7cf994).

## Dizin Yapisi

```
frontend/src/
├── app/
│   ├── layout.tsx              (root: fonts, providers, toaster)
│   ├── page.tsx                (redirect > /auth/login)
│   ├── globals.css             (Stitch tokens + base styles)
│   ├── auth/
│   │   ├── login/page.tsx      (email/password + Google OAuth + "Sifremi Unuttum" linki)
│   │   ├── register/page.tsx   (name, email, password + optional restaurantName + Google OAuth)
│   │   └── callback/page.tsx   (Supabase OAuth callback handler)
│   ├── admin/
│   │   ├── layout.tsx          (SuperAdmin guard + sidebar)
│   │   ├── page.tsx            (istatistik kartlari)
│   │   ├── login/page.tsx      (ayni login formu, basarili giris sonrasi isSuperAdmin kontrolu ile /admin'e yonlendirir)
│   │   └── restaurants/
│   │       ├── page.tsx        (tum restoranlar listesi + filtreleme)
│   │       └── [id]/page.tsx   (restoran detay — GET /admin/restaurants listesinden client-side filtreleme)
│   ├── dashboard/
│   │   ├── layout.tsx          (sidebar + header + auth guard + restoran olusturma ekrani)
│   │   ├── page.tsx            (panel — KPI verileri: GET /revenues/summary/monthly + GET /personnel count)
│   │   ├── personnel/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── positions/page.tsx
│   │   ├── finance/
│   │   │   ├── page.tsx
│   │   │   ├── revenues/page.tsx
│   │   │   ├── expenses/page.tsx
│   │   │   └── distribute/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── suppliers/page.tsx
│   │   │   └── movements/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── categories/page.tsx
│   │   ├── menu/
│   │   │   ├── page.tsx
│   │   │   └── qr/page.tsx
│   │   ├── simulation/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   └── users/page.tsx
│   ├── m/[slug]/
│   │   ├── page.tsx
│   │   ├── client.tsx
│   │   └── not-found.tsx
│   └── privacy/page.tsx
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── create-restaurant-screen.tsx
│   ├── ui/                     (shadcn/ui + Stitch overrides)
│   ├── data-table/
│   │   ├── data-table.tsx
│   │   ├── column-header.tsx
│   │   ├── pagination.tsx
│   │   ├── toolbar.tsx
│   │   └── view-options.tsx
│   └── reports/
│       ├── monthly-report.tsx
│       ├── weekly-report.tsx
│       ├── comparison-report.tsx
│       ├── report-table.tsx
│       └── editable-cell.tsx
├── hooks/
│   ├── use-auth.ts
│   └── use-reports.ts
├── stores/
│   └── auth-store.ts
├── lib/
│   ├── api.ts                  (axios + interceptors)
│   ├── supabase.ts             (Supabase client — sadece OAuth icin)
│   └── utils.ts
└── messages/
    └── tr.json                 (statik Turkce string sabitleri — i18n kutuphanesi yok)
```

## Ozel Akislar

### Restoran Olusturma Akisi

Kullanicinin onaylanmis restorani yoksa `dashboard/layout.tsx` icinde kosullu render:
- SuperAdmin ise > `/admin`'e yonlendir
- Normal kullanici ise > `CreateRestaurantScreen` component'ini goster (modal/overlay)
- API: `POST /restaurants` ile restoran olusturulur
- Olusturulduktan sonra "Onay bekleniyor" mesaji gosterilir

### OAuth (Google Login) Akisi

1. Login/Register'da "Google ile Giris" butonuna tiklanir
2. Supabase client `signInWithOAuth({ provider: 'google' })` cagirilir
3. Google auth sonrasi `/auth/callback`'e yonlendirilir
4. Callback'te Supabase session'dan token alinir
5. Backend'e `/auth/me` ile kullanici bilgisi cekilir
6. Token'lar localStorage'a kaydedilir
7. `/dashboard`'a yonlendirilir

### Sifremi Unuttum Akisi

1. Login sayfasinda "Sifremi Unuttum" linki
2. Tiklaninca email input dialog/inline form acilir
3. `POST /auth/forgot-password` ile backend'e istek
4. Basarili mesaji gosterilir ("E-postanizi kontrol edin")

### Admin Restoran Detay Sayfasi

Backend'de `GET /admin/restaurants/:id` endpoint'i yok. Bu sayfa:
- `GET /admin/restaurants` listesinden client-side ID ile filtreleme yapacak
- Veya ilk render'da listeyi cache'ten okuyacak (React Query)

## API Entegrasyonu

- axios instance: `NEXT_PUBLIC_API_URL` (default: localhost:3001/api)
- Request interceptor: `Authorization: Bearer {token}` + `x-restaurant-id` header
- 401 handler: refresh token via `/auth/refresh`, retry original request, fallback to login
- React Query config: staleTime 60s, retry 1

### Dashboard KPI Veri Kaynaklari

| KPI | Endpoint | Hesaplama |
|-----|----------|-----------|
| Aylik Ciro | GET /revenues/summary/monthly?month=YYYY-MM | totalRevenue alani |
| Aylik Gider | GET /revenues/summary/monthly?month=YYYY-MM | totalExpenses alani |
| Brut Kar | Hesaplanan | totalRevenue - totalExpenses |
| Personel Sayisi | GET /personnel | isActive=true filtreli count |

Onceki ay karsilastirmasi icin ayni endpoint iki kez cagirilir (su anki ay + onceki ay).

## Backend API Endpoints (Tam Referans)

### Auth

| Method | Path | Aciklama |
|--------|------|----------|
| POST | /auth/register | Kayit (email, password, name, restaurantName?) |
| POST | /auth/login | Giris (email, password) |
| POST | /auth/refresh | Token yenileme (refreshToken) |
| POST | /auth/forgot-password | Sifre sifirlama (email) |
| GET | /auth/me | Mevcut kullanici bilgisi (JWT) |

### Restaurant

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| POST | /restaurants | Restoran olustur | JWT |
| GET | /restaurants/my | Kullanicinin restoranlari | JWT |
| GET | /restaurants/current | Aktif restoran detay | JWT + Restaurant |
| PATCH | /restaurants/current | Restoran guncelle | JWT + Restaurant + ADMIN |
| PATCH | /restaurants/current/settings | Ayarlar JSON guncelle | JWT + Restaurant + ADMIN |
| GET | /restaurants/current/members | Uye listesi | JWT + Restaurant + ADMIN |
| POST | /restaurants/current/members | Uye ekle | JWT + Restaurant + ADMIN |
| PATCH | /restaurants/current/members/:userId/role | Rol degistir | JWT + Restaurant + ADMIN |
| DELETE | /restaurants/current/members/:userId | Uye deaktif et | JWT + Restaurant + ADMIN |
| DELETE | /restaurants/current/members/:userId/permanent | Uye kaldir | JWT + Restaurant + ADMIN |
| POST | /restaurants/current/transfer-ownership | Sahiplik devret | JWT + Restaurant + OWNER |

### Personnel

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| POST | /personnel | Personel olustur | ADMIN, HR |
| GET | /personnel | Personel listesi | ADMIN, HR |
| GET | /personnel/:id | Personel detay + izinler | ADMIN, HR |
| PATCH | /personnel/:id | Personel guncelle | ADMIN, HR |
| DELETE | /personnel/:id | Pasife al (soft delete) | ADMIN, HR |
| DELETE | /personnel/:id/permanent | Kalici sil | ADMIN, HR |
| POST | /personnel/:id/leaves | Izin olustur | ADMIN, HR |
| GET | /personnel/:id/leaves | Izin listesi | ADMIN, HR |
| PATCH | /personnel/:id/leaves/:leaveId | Izin durumu guncelle | ADMIN, HR |
| GET | /personnel/:id/work-days?month=YYYY-MM | Calisma gunu hesapla | ADMIN, HR |

### Position Config

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /position-configs | Pozisyon listesi | ADMIN, HR |
| POST | /position-configs | Pozisyon olustur | ADMIN, HR |
| PATCH | /position-configs/:id | Pozisyon guncelle | ADMIN, HR |
| DELETE | /position-configs/:id | Pozisyon sil | ADMIN, HR |

### Finance — Revenue

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| POST | /revenues | Ciro olustur | ADMIN, ACCOUNTANT |
| GET | /revenues | Ciro listesi (filters: startDate, endDate, month) | ADMIN, ACCOUNTANT |
| GET | /revenues/:id | Ciro detay | ADMIN, ACCOUNTANT |
| PATCH | /revenues/:id | Ciro guncelle | ADMIN, ACCOUNTANT |
| DELETE | /revenues/:id | Ciro sil | ADMIN, ACCOUNTANT |
| GET | /revenues/summary/monthly?month=YYYY-MM | Aylik ozet | ADMIN, ACCOUNTANT |

### Finance — Expense

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| POST | /expenses | Gider olustur | ADMIN, ACCOUNTANT |
| GET | /expenses | Gider listesi (filters: category, startDate, endDate) | ADMIN, ACCOUNTANT |
| GET | /expenses/:id | Gider detay | ADMIN, ACCOUNTANT |
| PATCH | /expenses/:id | Gider guncelle | ADMIN, ACCOUNTANT |
| DELETE | /expenses/:id | Gider sil | ADMIN, ACCOUNTANT |
| POST | /expenses/:id/distribute | Gider dagit (distributionType, distributionMonths) | ADMIN, ACCOUNTANT |
| POST | /expenses/:id/undistribute | Dagitimi iptal et | ADMIN, ACCOUNTANT |

### Finance — Expense Category

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /expense-categories | Kategori listesi | ADMIN, ACCOUNTANT |
| POST | /expense-categories | Kategori olustur | ADMIN, ACCOUNTANT |
| PATCH | /expense-categories/:id | Kategori guncelle | ADMIN, ACCOUNTANT |
| DELETE | /expense-categories/:id | Kategori sil | ADMIN, ACCOUNTANT |

### Inventory — Raw Material

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /raw-materials | Hammadde listesi | ADMIN, STOCK_MANAGER |
| GET | /raw-materials/low-stock | Dusuk stok listesi | ADMIN, STOCK_MANAGER |
| GET | /raw-materials/:id | Hammadde detay | ADMIN, STOCK_MANAGER |
| POST | /raw-materials | Hammadde olustur | ADMIN, STOCK_MANAGER |
| PATCH | /raw-materials/:id | Hammadde guncelle | ADMIN, STOCK_MANAGER |
| DELETE | /raw-materials/:id | Hammadde sil | ADMIN, STOCK_MANAGER |

### Inventory — Stock Movement

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /stock-movements | Hareket listesi | ADMIN, STOCK_MANAGER |
| GET | /stock-movements/by-material/:rawMaterialId | Malzemeye gore hareketler | ADMIN, STOCK_MANAGER |
| POST | /stock-movements | Hareket olustur (IN/OUT) | ADMIN, STOCK_MANAGER |

### Inventory — Supplier

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /suppliers | Tedarikci listesi | ADMIN, STOCK_MANAGER |
| POST | /suppliers | Tedarikci olustur | ADMIN, STOCK_MANAGER |
| PATCH | /suppliers/:id | Tedarikci guncelle | ADMIN, STOCK_MANAGER |
| DELETE | /suppliers/:id | Tedarikci sil | ADMIN, STOCK_MANAGER |

### Inventory — Material Type

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /material-types | Tip listesi | ADMIN, STOCK_MANAGER |
| POST | /material-types | Tip olustur | ADMIN, STOCK_MANAGER |
| PATCH | /material-types/:id | Tip guncelle | ADMIN, STOCK_MANAGER |
| DELETE | /material-types/:id | Tip sil | ADMIN, STOCK_MANAGER |

### Products

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /products | Urun listesi | ADMIN, MENU_MANAGER |
| GET | /products/:id | Urun detay | ADMIN, MENU_MANAGER |
| GET | /products/:id/cost | Maliyet kirilimi | ADMIN, MENU_MANAGER |
| POST | /products | Urun olustur | ADMIN, MENU_MANAGER |
| PATCH | /products/:id | Urun guncelle | ADMIN, MENU_MANAGER |
| DELETE | /products/:id | Urun sil | ADMIN, MENU_MANAGER |
| POST | /products/:id/ingredients | Icerik ekle | ADMIN, MENU_MANAGER |
| PATCH | /products/:id/ingredients/:ingredientId | Icerik guncelle | ADMIN, MENU_MANAGER |
| DELETE | /products/:id/ingredients/:ingredientId | Icerik sil | ADMIN, MENU_MANAGER |

### Categories

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /categories | Kategori listesi | ADMIN, MENU_MANAGER |
| POST | /categories | Kategori olustur | ADMIN, MENU_MANAGER |
| PATCH | /categories/:id | Kategori guncelle | ADMIN, MENU_MANAGER |
| DELETE | /categories/:id | Kategori sil | ADMIN, MENU_MANAGER |
| PATCH | /categories/order | Siralama guncelle (items: [{id, displayOrder}]) | ADMIN, MENU_MANAGER |

### Menu

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /menu | Menu ogelerini getir | ADMIN, MENU_MANAGER |
| PATCH | /menu/order | Siralama guncelle | ADMIN, MENU_MANAGER |
| PATCH | /menu/:productId/availability | Durum toggle | ADMIN, MENU_MANAGER |
| GET | /menu/public/:slug | Herkese acik menu (auth yok) | - |

### Reports

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /reports/monthly?month=YYYY-MM | Aylik rapor | ADMIN, ACCOUNTANT |
| GET | /reports/weekly?week=YYYY-Www | Haftalik rapor | ADMIN, ACCOUNTANT |
| GET | /reports/compare?periods=X,Y&type=monthly|weekly | Karsilastirma | ADMIN, ACCOUNTANT |
| POST | /reports/generate | PDF/HTML olustur (period, format) | ADMIN, ACCOUNTANT |

### Simulation

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /simulations | Simulasyon listesi | ADMIN |
| GET | /simulations/:id | Simulasyon detay | ADMIN |
| POST | /simulations | Simulasyon olustur (name, month) | ADMIN |
| PATCH | /simulations/:id | Simulasyon guncelle | ADMIN |
| DELETE | /simulations/:id | Simulasyon sil | ADMIN |
| POST | /simulations/:id/duplicate | Simulasyon kopyala (name) | ADMIN |
| POST | /simulations/:id/expenses | Gider ekle (name, amount, type?) | ADMIN |
| DELETE | /simulations/:id/expenses/:expenseId | Gider sil | ADMIN |
| POST | /simulations/:id/revenues | Gelir ekle (name, amount) | ADMIN |
| DELETE | /simulations/:id/revenues/:productId | Gelir sil | ADMIN |

### Simulation — Fixed Templates

| Method | Path | Aciklama | Guard |
|--------|------|----------|-------|
| GET | /sim-fixed-expenses | Sabit gider sablonlari | ADMIN |
| POST | /sim-fixed-expenses | Sablon olustur | ADMIN |
| PATCH | /sim-fixed-expenses/:id | Sablon guncelle | ADMIN |
| DELETE | /sim-fixed-expenses/:id | Sablon sil | ADMIN |
| GET | /sim-fixed-revenues | Sabit gelir sablonlari | ADMIN |
| POST | /sim-fixed-revenues | Sablon olustur | ADMIN |
| DELETE | /sim-fixed-revenues/:id | Sablon sil | ADMIN |

### Admin (SuperAdmin Only)

| Method | Path | Aciklama |
|--------|------|----------|
| GET | /admin/restaurants | Tum restoranlar (filter: status?) |
| PATCH | /admin/restaurants/:id/approve | Onayla/Reddet (status) |
| DELETE | /admin/restaurants/:id | Restoran sil |
| GET | /admin/stats | Platform istatistikleri |

## Roller

OWNER, ADMIN, ACCOUNTANT, HR, STOCK_MANAGER, MENU_MANAGER, WAITER

## Modüller ve Sayfa Sayilari

| Modul | Sayfa | Stitch Tasarimi |
|-------|-------|-----------------|
| Auth | 3 (login, register, callback) | Login + Register |
| Dashboard Layout | 1 (layout + sidebar + header) | Dashboard |
| Panel | 1 | Dashboard |
| Personel | 4 (list, new, detail, positions) | List + Detail + New |
| Finans | 4 (overview, revenues, expenses, distribute) | Overview |
| Stok | 3 (materials, suppliers, movements) | Yok |
| Urunler | 4 (list, new, detail, categories) | Yok |
| Menu | 3 (management, qr, public) | Yok |
| Simulasyon | 2 (list, detail) | Yok |
| Raporlar | 1 (3 tab) | Yok |
| Ayarlar | 1 | Yok |
| Kullanicilar | 1 | Yok |
| Admin | 3 (dashboard, restaurants, detail) | Yok |
| Privacy | 1 | Yok |
| **Toplam** | **~32 sayfa** | **7 tasarim** |

Tasarimi olmayan sayfalar Stitch design system kurallarina (renk, tipografi, no-border, tonal layering, component stilleri) sadik kalinarak kodlanacak.

## CLAUDE.md Guncellemesi

CLAUDE.md'de degisecekler:
- `lucide-react` > `Google Material Symbols (Outlined, 24px) — Google Fonts CSS ile yuklenir`
- `recharts` cikarilacak > `shadcn/ui charts` eklenecek
- Font bilgisi eklenecek: `Manrope (basliklar) + Inter (body)`
- `xlsx` cikarilacak (bu rebuild'de yok)
- `motion` cikarilacak (CSS transitions yeterli)
- `html5-qrcode` cikarilacak (scanner yok)
- `qrcode.react` kalacak
