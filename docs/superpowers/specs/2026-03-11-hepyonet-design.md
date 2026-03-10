# HepYonet - Restoran Yonetim SaaS Platformu Tasarim Dokumani

## Ozet

Restoranlarin finansal sureclerini, personel yonetimini, stok takibini, urun/recete yonetimini, menu olusturmayi ve raporlamayi tek platformda yapabilecegi bir SaaS uygulamasi.

## Teknoloji Stack

| Katman | Teknoloji | Aciklama |
|--------|-----------|----------|
| Backend | NestJS (TypeScript) | Moduler yapi, REST API |
| Frontend | Next.js (TypeScript) | Web paneli + QR menu |
| Veritabani | PostgreSQL (Supabase hosted) | Iliskisel veri modeli |
| ORM | Prisma | Type-safe DB erisimi |
| Auth | Supabase Auth | JWT tabanli kimlik dogrulama |
| UI | Tailwind CSS + shadcn/ui | Hizli gelistirme |
| State | Zustand | Hafif state yonetimi |
| API Client | TanStack Query | Cache, loading, refetch |
| Tablolar | TanStack Table | Siralama, filtreleme, pagination |
| Grafikler | Recharts | Raporlama gorsellleri |
| i18n | next-intl | Coklu dil (baslangicta Turkce) |

## Mimari

```
Clients (Next.js Web, Mobile App, POS, QR Menu)
                    |
            NestJS Backend (REST API)
                    |
            PostgreSQL (Supabase)
```

- Ayri frontend + backend (gelecekte mobil app, POS entegrasyonu icin)
- Multi-tenancy: Shared database, her kayitta `restaurantId`
- Abonelik altyapisi hazir, baslangicta ucretsiz

## Veritabani Modeli

### Restaurant
- id, name, slug (unique), logo, address, phone
- status: PENDING / APPROVED / REJECTED
- subscriptionPlan (gelecek icin)
- settings (JSON)
- createdAt

### User
- id, email, password, restaurantId
- role: ADMIN / ACCOUNTANT / HR / STOCK_MANAGER / MENU_MANAGER
- isActive

### Personnel
- id, restaurantId, name, surname, phone, tcNo
- position, startDate, salary, isActive

### LeaveRecord
- id, restaurantId, personnelId
- startDate, endDate
- type: ANNUAL / SICK / OTHER
- status: PENDING / APPROVED / REJECTED

### RawMaterial
- id, restaurantId, name
- unit: KG / LT / ADET / GR / ML
- currentStock, lastPurchasePrice, minStockLevel

### Product
- id, restaurantId, name, code (urun kodu)
- description, image, price
- isMenuItem (menuye koyulacak mi)
- isComposite (alt urunlerden mi olusuyor)
- category

### ProductIngredient
- id, productId
- rawMaterialId (nullable) - ham maddeden olusuyorsa
- subProductId (nullable) - alt urunden olusuyorsa
- quantity, unit

### MenuItem (veya Product.isMenuItem flag'i ile)
- productId, restaurantId
- displayOrder, isAvailable

### Expense
- id, restaurantId, title, amount
- category: SALARY / BILL / TAX / RENT / SUPPLIER / OTHER
- paymentDate
- isDistributed (bool)
- distributionType: NONE / EQUAL / REVENUE_BASED
- distributionMonths (int)

### ExpenseDistribution
- id, expenseId
- month (YYYY-MM)
- amount

### Revenue (Ciro)
- id, restaurantId, date, amount
- source: MANUAL / API
- notes

### StockMovement
- id, restaurantId, rawMaterialId
- quantity, unitPrice
- type: IN / OUT
- supplier, invoiceNo, date

## Roller ve Yetkiler

5 sabit rol:

| Ozellik | Admin | Muhasebe | IK | Depocu | Menu Yoneticisi |
|---------|:-----:|:--------:|:--:|:------:|:---------------:|
| Kullanici/Rol yonetimi | + | - | - | - | - |
| Restoran ayarlari | + | - | - | - | - |
| Personel yonetimi | + | - | + | - | - |
| Izin yonetimi | + | - | + | - | - |
| Gider/Gelir girisi | + | + | - | - | - |
| Gider dagitimi | + | + | - | - | - |
| Raporlama | + | + | - | - | - |
| Ham madde yonetimi | + | - | - | + | - |
| Stok hareketleri | + | - | - | + | - |
| Urun/Recete yonetimi | + | - | - | - | + |
| Menu yonetimi | + | - | - | - | + |
| QR kod olusturma | + | - | - | - | + |

## API Modulleri

### Auth: /auth
- POST /register, /login, /refresh, /forgot-password

### Restaurant: /restaurant
- GET /, PATCH /, PATCH /settings

### Users: /users
- POST /, GET /, PATCH /:id/role, DELETE /:id

### Personnel: /personnel
- CRUD /personnel
- GET /:id/leaves, POST /:id/leaves, PATCH /:id/leaves/:leaveId
- GET /:id/work-days

### Finance: /expenses, /revenues
- CRUD /expenses, POST /expenses/:id/distribute
- CRUD /revenues
- GET /finance/summary?month=YYYY-MM

### Inventory: /raw-materials, /stock-movements
- CRUD /raw-materials
- POST /stock-movements
- GET /raw-materials/:id/movements
- GET /raw-materials/low-stock

### Products: /products
- CRUD /products
- POST /:id/ingredients, PATCH /:id/ingredients/:ingredientId
- GET /:id/cost

### Menu: /menu
- GET /menu, PATCH /menu/order, PATCH /menu/:productId/availability
- GET /public/menu/:slug (public, no auth)

### Reporting: /reports
- GET /monthly?month=YYYY-MM
- GET /weekly?week=YYYY-WXX
- GET /compare?periods=YYYY-MM,YYYY-MM
- POST /generate (PDF/HTML cikti)

### Super Admin: /admin
- GET /restaurants, PATCH /restaurants/:id/approve
- GET /stats

## Raporlama Sistemi

### Gider Dagitim Mantigi

Bir gider girildiginde 3 secenek:
1. **NONE**: Gider odeme tarihindeki aya yazilir
2. **EQUAL**: Gider belirtilen ay sayisina esit bolunur
3. **REVENUE_BASED**: Gider belirtilen aylara ciro oraninda dagitilir

### Ay Sonu Raporu Akisi

1. Sistem DB'den tum gelir ve giderleri cekerken dagitilmis giderleri de dahil eder
2. Vergi otomatik hesaplanir
3. Kullanici rapor ekraninda herhangi bir degeri elle duzeltebilir (sadece cikti icin, DB'ye yazilmaz)
4. "Raporla" butonuyla PDF veya HTML olarak cikti alinir
5. Elle duzeltilen alanlar raporda isaretlenir

### Urun Maliyet Hesaplama

Urunler ham maddelerden ve/veya alt urunlerden olusur. Maliyet recursive olarak hesaplanir:
- Ham madde maliyeti = miktar x birim fiyat
- Urun maliyeti = icindeki ham madde ve alt urun maliyetlerinin toplami
- Menu urununde kar marji = (satis fiyati - maliyet) / satis fiyati

## Frontend Yapisi

### Super Admin Paneli (/admin/...)
- /admin/login, /admin/dashboard, /admin/restaurants, /admin/restaurants/:id

### Restoran Paneli (/dashboard/...)
- /auth/register, /auth/login
- /dashboard (ozet kartlar)
- /dashboard/personnel, /dashboard/personnel/:id
- /dashboard/finance, /dashboard/finance/expenses, /dashboard/finance/revenues, /dashboard/finance/distribute
- /dashboard/inventory, /dashboard/inventory/movements
- /dashboard/products, /dashboard/products/:id
- /dashboard/menu, /dashboard/menu/qr
- /dashboard/reports
- /dashboard/settings
- /dashboard/users

### Public QR Menu (/m/:slug)
- Auth gerektirmez, mobil oncelikli, SSR, responsive
- Restoranin logosu, adi, kategoriler, urunler, fiyatlar, gorseller

## Guvenlik

- JWT Token (Supabase Auth)
- Restaurant Guard (kullanici sadece kendi restoraninin verisine erisir)
- Role Guard (endpoint bazinda rol kontrolu)
- Rate Limiting
- Input Validation (class-validator)
