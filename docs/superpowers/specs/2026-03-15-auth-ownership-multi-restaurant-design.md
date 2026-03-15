# Kimlik Dogrulama, Sahiplik ve Coklu Restoran Sistemi

**Tarih:** 2026-03-15
**Durum:** Onaylandi

## Ozet

Mevcut sisteme Google OAuth eklenecek, restoran sahiplik kavramı getirilecek, kullanıcılar birden fazla restorana bağlanabilecek ve roller restoran bazlı olacak.

## Kararlar

| Karar | Secim |
|-------|-------|
| Kayıt akışı | Restoransız hesap açılabilir, restoran sonradan da oluşturulabilir |
| Garson rolü | Şimdilik sadece tanımlanır, erişim detayları ileride belirlenir |
| Kullanıcı ekleme | Email ile arama — kayıtlı değilse hata verir |
| Sahiplik devri | Aynı restoranda kayıtlı bir kullanıcıya devredilir |
| Restoran geçişi | Header'da dropdown ile, sayfa yenilenmeden |
| Personnel–Users ilişkisi | Ayrı tablolar, opsiyonel userId ile bağlantı |

## 1. Kimlik Dogrulama

### 1.1 Kayıt

- Email/şifre veya Google OAuth ile kayıt olunabilir.
- Supabase Auth'un Google provider'ı kullanılır.
- Kayıt sırasında restoran oluşturma opsiyoneldir.
- Google ile kayıt olan kullanıcı otomatik olarak `users` tablosuna eklenir.

### 1.2 Giriş

- Email/şifre ile mevcut akış korunur.
- Google ile giriş eklenir.
- Google ile ilk kez giren kullanıcı `users` tablosunda yoksa otomatik oluşturulur.

### 1.3 Supabase Konfigürasyonu

- Supabase Dashboard > Authentication > Providers > Google etkinleştirilir.
- Google Cloud Console'dan OAuth Client ID/Secret alınır.
- Frontend'de Supabase JS client ile `signInWithOAuth({ provider: 'google' })` çağrılır.
- OAuth callback sonrası backend'e token gönderilir, `users` kaydı oluşturulur/güncellenir.

## 2. Veritabani Degisiklikleri

### 2.1 `User` tablosu

Kaldırılacak alanlar:
- `restaurantId` (tek restoran varsayımı bitiyor)
- `role` (roller restoran bazlı olacak)

Eklenecek alanlar:
- `avatarUrl: String?` (Google profil fotoğrafı)

Korunacak alanlar:
- `id`, `supabaseId`, `email`, `name`, `isActive`, `isSuperAdmin`, `createdAt`, `updatedAt`

### 2.2 Yeni `RestaurantMember` tablosu

```prisma
model RestaurantMember {
  id           String   @id @default(uuid())
  userId       String
  restaurantId String
  role         MemberRole
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user       User       @relation(fields: [userId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([userId, restaurantId])
  @@map("restaurant_members")
}
```

### 2.3 `MemberRole` enum

```prisma
enum MemberRole {
  OWNER
  ADMIN
  ACCOUNTANT
  HR
  STOCK_MANAGER
  MENU_MANAGER
  WAITER
}
```

Mevcut `Role` enum'u `MemberRole` ile değiştirilir.

### 2.4 `Restaurant` tablosu

Eklenecek alan:
- `ownerId: String` (User'a FK — sahip)

### 2.5 `Personnel` tablosu

Eklenecek alan:
- `userId: String?` (User'a opsiyonel FK — sisteme kayıtlı personel bağlantısı)

## 3. Sahiplik

### 3.1 Restoran Oluşturma

- Kullanıcı yeni restoran oluşturduğunda otomatik olarak `OWNER` rolüyle `restaurant_members`'a eklenir.
- `Restaurant.ownerId` bu kullanıcıya set edilir.

### 3.2 Sahiplik Devri

- Sadece mevcut sahip (`OWNER`) devredebilir.
- Hedef kullanıcı aynı restoranda `restaurant_members` kaydı olan biri olmalı.
- İşlem:
  1. Yeni sahip: `restaurant_members.role` → `OWNER`, `restaurant.ownerId` → yeni sahip
  2. Eski sahip: `restaurant_members.role` → `ADMIN`
- Tek bir transaction içinde yapılır.

## 4. Coklu Restoran ve Gecis

### 4.1 Veri Yapısı

- Bir kullanıcı `restaurant_members` üzerinden birden fazla restorana bağlı olabilir.
- Her restoranda farklı rolü olabilir.

### 4.2 Frontend Geçiş

- Header'da aktif restoran ismiyle bir dropdown gösterilir.
- Kullanıcının üye olduğu tüm restoranlar listelenir.
- Seçim değiştiğinde Zustand store güncellenir.
- `activeRestaurantId` localStorage'da da saklanır (sayfa yenilenince korunması için).

### 4.3 API Entegrasyonu

- Her API isteğinde `x-restaurant-id` header'ı gönderilir.
- Axios interceptor'da aktif restoran ID'si otomatik eklenir.
- Backend `RestaurantGuard` bu header'ı okur.

## 5. Kullanici Ekleme Akisi

### 5.1 Yönetici Tarafı

- `OWNER` veya `ADMIN` rolündeki kullanıcı, "Kullanıcılar" sayfasından email + rol girerek ekler.
- Backend email'i `users` tablosunda arar.
- Bulursa → `restaurant_members` kaydı oluşturur.
- Bulamazsa → `400: Bu kullanıcı sistemde bulunamadı` hatası döner.

### 5.2 Kullanıcı Tarafı

- Eklenen kullanıcı, bir sonraki girişinde header dropdown'unda yeni restoranı görür.
- O restorana geçiş yaparak erişebilir.

## 6. Guard/Middleware Degisiklikleri

### 6.1 `JwtAuthGuard`

- Değişiklik yok. Supabase token doğrulaması aynı kalır.
- Kullanıcıyı `users` tablosundan `supabaseId` ile bulur.

### 6.2 `RestaurantGuard`

- `request.headers['x-restaurant-id']` header'ından restoran ID'sini alır.
- `restaurant_members` tablosunda `userId + restaurantId` kombinasyonunu kontrol eder.
- Üyelik yoksa veya `isActive: false` ise → `403 Forbidden`.
- Restoran `status !== APPROVED` ise → `403`.
- `request.user` nesnesine `restaurantId` ve `memberRole` ekler.

### 6.3 `RolesGuard`

- `request.user.memberRole` üzerinden kontrol yapar (eski `user.role` yerine).
- `OWNER` rolü tüm yetkilere sahiptir.

## 7. Frontend Degisiklikleri

### 7.1 Auth Sayfaları

- Login sayfasına "Google ile Giriş Yap" butonu eklenir.
- Register sayfasına "Google ile Kayıt Ol" butonu eklenir.
- Register'da restoran adı opsiyonel hale gelir.

### 7.2 Auth Store (Zustand)

- `activeRestaurantId` state'e eklenir.
- `restaurants` listesi (üye olunan restoranlar) state'e eklenir.
- `switchRestaurant(id)` action eklenir.

### 7.3 Header

- Restoran seçici dropdown eklenir (birden fazla restoran varsa görünür).
- Aktif restoran ismi gösterilir.

### 7.4 Dashboard Layout

- Kullanıcının hiç restoranı yoksa "Restoran Oluştur" sayfasına yönlendirir.
- `activeRestaurantId` yoksa ilk restoranı otomatik seçer.

### 7.5 Kullanıcılar Sayfası

- Mevcut sayfa güncellenir: `restaurant_members` üzerinden çalışır.
- Sahiplik devri butonu eklenir (sadece OWNER görür).

### 7.6 Restoran Ayarları

- "Sahipliği Devret" bölümü eklenir.
- Restoranda kayıtlı kullanıcılar arasından seçim yapılır.

## 8. API Endpoint Degisiklikleri

### 8.1 Yeni Auth Endpoints

```
POST /auth/google          - Google OAuth callback işleme
POST /auth/register        - Güncellenir: restoran opsiyonel
```

### 8.2 Yeni Restaurant Endpoints

```
POST /restaurants                    - Yeni restoran oluştur
GET  /restaurants/my                 - Kullanıcının üye olduğu restoranlar
POST /restaurants/:id/transfer-ownership - Sahiplik devret
```

### 8.3 Güncellenen User Endpoints

```
GET  /users                - restaurant_members üzerinden listele (x-restaurant-id header)
POST /users                - Email ile kullanıcı ara ve restaurant_members'a ekle
PATCH /users/:id/role      - restaurant_members.role güncelle
DELETE /users/:id          - restaurant_members.isActive = false
```

## 9. Migrasyon Stratejisi

Mevcut verilerin korunması için migrasyon adımları:

1. `RestaurantMember` tablosu oluştur.
2. `Restaurant` tablosuna `ownerId` ekle.
3. Mevcut `users` tablosundaki her kayıt için `restaurant_members` kaydı oluştur (aynı `restaurantId` ve `role` ile).
4. Her restoranın `ownerId`'sini, o restoranda `ADMIN` rolündeki ilk kullanıcıya set et.
5. `User` tablosundan `restaurantId` ve `role` alanlarını kaldır.
6. `Role` enum'unu `MemberRole` ile değiştir.
