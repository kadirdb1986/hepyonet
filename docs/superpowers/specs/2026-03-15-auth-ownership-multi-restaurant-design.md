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
- Google ile ilk kez giren kullanıcı `users` tablosunda yoksa otomatik oluşturulur (auto-provisioning).

### 1.3 Supabase Konfigürasyonu

- Supabase Dashboard > Authentication > Providers > Google etkinleştirilir.
- Google Cloud Console'dan OAuth Client ID/Secret alınır.
- Frontend'de Supabase JS client ile `signInWithOAuth({ provider: 'google' })` çağrılır.
- OAuth sonrası frontend Supabase session alır. Mevcut `GET /auth/me` akışı ile backend'e Authorization header'da Supabase access token gönderilir.
- `JwtAuthGuard` token'ı doğrular, `users` tablosunda kayıt yoksa otomatik oluşturur (auto-provisioning). Ayrı bir `POST /auth/google` endpoint'i gerekmez.

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

Mevcut `Role` enum'u `MemberRole` ile değiştirilir. `@Roles()` dekoratörü de `MemberRole` kullanacak şekilde güncellenir.

### 2.4 `Restaurant` tablosu

`ownerId` alanı eklenmez. Sahiplik tek kaynak olarak `RestaurantMember.role = OWNER` üzerinden belirlenir. Sahibi bulmak için:
```sql
SELECT user_id FROM restaurant_members WHERE restaurant_id = ? AND role = 'OWNER'
```

### 2.5 `Personnel` tablosu

Eklenecek alan:
- `userId: String?` (User'a opsiyonel FK — sisteme kayıtlı personel bağlantısı)

## 3. Sahiplik

### 3.1 Restoran Oluşturma

- Kullanıcı yeni restoran oluşturduğunda otomatik olarak `OWNER` rolüyle `restaurant_members`'a eklenir.

### 3.2 Sahiplik Devri

- Sadece mevcut sahip (`OWNER`) devredebilir.
- Hedef kullanıcı aynı restoranda aktif `restaurant_members` kaydı olan biri olmalı.
- İşlem (tek transaction):
  1. Yeni sahip: `restaurant_members.role` → `OWNER`
  2. Eski sahip: `restaurant_members.role` → `ADMIN`

### 3.3 Sahiplik Koruması

- `OWNER` rolündeki kullanıcı, üyelik yönetimi endpoint'leri ile devre dışı bırakılamaz veya rolü değiştirilemez.
- Sahipliği değiştirmenin tek yolu `transfer-ownership` endpoint'idir.
- Her restoranda tam olarak bir `OWNER` olmalıdır.

## 4. Coklu Restoran ve Gecis

### 4.1 Veri Yapısı

- Bir kullanıcı `restaurant_members` üzerinden birden fazla restorana bağlı olabilir.
- Her restoranda farklı rolü olabilir.

### 4.2 Frontend Geçiş

- Header'da aktif restoran ismiyle bir dropdown gösterilir.
- Sadece `isActive: true` olan üyelikler listelenir.
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

### 5.3 Devre Dışı Bırakma ve Yeniden Ekleme

- `DELETE` ile üyelik `isActive: false` yapılır. Kullanıcı o restoranı dropdown'da görmez.
- Aynı email tekrar eklenirse `isActive: true` yapılarak yeniden aktifleştirilir.
- `OWNER` devre dışı bırakılamaz (bkz. 3.3).

## 6. Guard/Middleware Degisiklikleri

### 6.1 `JwtAuthGuard`

- Supabase token doğrulaması aynı kalır.
- Kullanıcıyı `users` tablosundan `supabaseId` ile bulur.
- **Değişiklik:** `include: { restaurant: true }` kaldırılır. Sadece base User yüklenir.
- **Değişiklik:** Token'dan gelen `supabaseId` ile `users` tablosunda kayıt bulunamazsa ve token geçerliyse (Google OAuth ilk giriş), kullanıcı otomatik oluşturulur (auto-provisioning).

### 6.2 `RestaurantGuard`

- `request.headers['x-restaurant-id']` header'ından restoran ID'sini alır.
- **Async guard olur** — `PrismaService` inject eder.
- `restaurant_members` tablosunda `userId + restaurantId` kombinasyonunu kontrol eder, aynı sorguda `restaurant` bilgisini de join ile yükler.
- Üyelik yoksa veya `isActive: false` ise → `403 Forbidden`.
- Restoran `status !== APPROVED` ise → `403`.
- `request.user` nesnesine `restaurantId`, `memberRole` ve `restaurant` entity ekler.
- **SuperAdmin:** `isSuperAdmin: true` ise üyelik kontrolü atlanır. `x-restaurant-id` header'ı hala gereklidir (hangi restoran üzerinde işlem yapıldığını belirler). `memberRole` set edilmez, `RolesGuard` SuperAdmin'i zaten bypass eder.

### 6.3 `RolesGuard`

- `request.user.memberRole` üzerinden kontrol yapar (eski `user.role` yerine).
- `OWNER` rolü tüm yetkilere sahiptir (tüm `@Roles()` kontrollerini geçer).
- `isSuperAdmin` olan kullanıcılar rol kontrolünü bypass eder (mevcut davranış korunur).

## 7. Frontend Degisiklikleri

### 7.1 Auth Sayfaları

- Login sayfasına "Google ile Giriş Yap" butonu eklenir.
- Register sayfasına "Google ile Kayıt Ol" butonu eklenir.
- Register'da restoran adı opsiyonel hale gelir.

### 7.2 Auth Store (Zustand)

- `activeRestaurantId` state'e eklenir.
- `memberships` listesi state'e eklenir (her biri: `restaurantId`, `restaurantName`, `restaurantSlug`, `restaurantStatus`, `role`).
- `switchRestaurant(id)` action eklenir.

### 7.3 Header

- Restoran seçici dropdown eklenir (birden fazla restoran varsa görünür, tek restoran varsa sadece isim gösterilir).
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

### 8.1 Auth Endpoints

```
POST /auth/register        - Güncellenir: restoran opsiyonel
POST /auth/login           - Aynı kalır
GET  /auth/me              - Güncellenir: memberships listesi döner
```

`GET /auth/me` yeni response formatı:
```json
{
  "id": "...",
  "email": "...",
  "name": "...",
  "avatarUrl": "...",
  "isSuperAdmin": false,
  "memberships": [
    {
      "restaurantId": "...",
      "restaurantName": "...",
      "restaurantSlug": "...",
      "restaurantStatus": "APPROVED",
      "role": "OWNER"
    }
  ]
}
```

### 8.2 Yeni Restaurant Endpoints

```
POST /restaurants                    - Yeni restoran oluştur (OWNER olarak)
GET  /restaurants/my                 - Kullanıcının üye olduğu restoranlar (isActive: true)
POST /restaurants/:id/transfer-ownership - Sahiplik devret (body: { targetUserId })
```

### 8.3 Üye Yönetimi Endpoints

```
GET    /restaurants/:id/members              - Üyeleri listele
POST   /restaurants/:id/members              - Üye ekle (body: { email, role })
PATCH  /restaurants/:id/members/:userId/role - Rol güncelle (OWNER hariç)
DELETE /restaurants/:id/members/:userId      - Üyelik devre dışı bırak (OWNER hariç)
```

## 9. Migrasyon Stratejisi

Mevcut verilerin korunması için migrasyon adımları:

1. `RestaurantMember` tablosu oluştur.
2. Mevcut `users` tablosundaki `restaurantId` NOT NULL olan her kayıt için `restaurant_members` kaydı oluştur (aynı `restaurantId` ve `role` ile). `restaurantId` NULL olan kullanıcılar sıfır üyelikle kalır — bu "restoransız kayıt" akışının beklenen durumudur.
3. Her restoranın sahibini belirle: o restoranda `ADMIN` rolündeki ilk kullanıcının `restaurant_members.role` değerini `OWNER` olarak güncelle. Eğer `ADMIN` yoksa, o restoranda herhangi bir rolde olan ilk kullanıcıyı `OWNER` yap ve logla.
4. `User` tablosundan `restaurantId` ve `role` alanlarını kaldır.
5. `Role` enum'unu `MemberRole` ile değiştir.
6. `Personnel` tablosuna nullable `userId` alanı ekle.
