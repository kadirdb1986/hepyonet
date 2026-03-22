# Simulation Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a simulation module that lets restaurant owners create monthly financial simulations with auto-populated revenues/expenses, adjustable prices, and real-time profit calculations.

**Architecture:** New `SimulationModule` in backend with 5 new DB tables. Templates (fixed expenses/revenues) stored at restaurant level, copied into each simulation. Product prices/costs copied into simulation-specific table. All calculations done client-side for instant feedback.

**Tech Stack:** NestJS, Prisma, Next.js, Zustand, React Query

---

## Chunk 1: Database Schema

### Task 1: Add simulation tables to Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add 5 new models and update Restaurant relations**

Add to Restaurant model relations:
```
simFixedExpenses  SimFixedExpense[]
simFixedRevenues  SimFixedRevenue[]
simulations       Simulation[]
```

Add after existing models:

```prisma
model SimFixedExpense {
  id           String   @id @default(uuid())
  restaurantId String
  name         String
  amount       Decimal  @db.Decimal(10, 2) @default(0)
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([restaurantId, name])
  @@map("sim_fixed_expenses")
}

model SimFixedRevenue {
  id           String  @id @default(uuid())
  restaurantId String
  productId    String
  quantity     Int     @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])
  product    Product    @relation(fields: [productId], references: [id])

  @@unique([restaurantId, productId])
  @@map("sim_fixed_revenues")
}

model Simulation {
  id              String   @id @default(uuid())
  restaurantId    String
  name            String
  month           String
  kdvRate         Decimal  @db.Decimal(5, 2) @default(10)
  incomeTaxRate   Decimal  @db.Decimal(5, 2) @default(20)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  restaurant Restaurant          @relation(fields: [restaurantId], references: [id])
  products   SimulationProduct[]
  expenses   SimulationExpense[]

  @@map("simulations")
}

model SimulationProduct {
  id           String  @id @default(uuid())
  simulationId String
  productId    String
  productName  String
  quantity     Int     @default(0)
  salePrice    Decimal @db.Decimal(10, 2)
  costPrice    Decimal @db.Decimal(10, 2)

  simulation Simulation @relation(fields: [simulationId], references: [id], onDelete: Cascade)

  @@unique([simulationId, productId])
  @@map("simulation_products")
}

enum SimExpenseType {
  PERSONNEL
  FIXED
  FOOD_COST
}

model SimulationExpense {
  id           String         @id @default(uuid())
  simulationId String
  name         String
  amount       Decimal        @db.Decimal(10, 2)
  type         SimExpenseType

  simulation Simulation @relation(fields: [simulationId], references: [id], onDelete: Cascade)

  @@map("simulation_expenses")
}
```

Also add to Product model:
```
simFixedRevenues SimFixedRevenue[]
```

- [ ] **Step 2: Push schema and generate client**

```bash
cd backend && npx prisma db push && npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add simulation module database tables"
```

---

## Chunk 2: Backend - Simulation Module

### Task 2: Create Simulation Module with all services and controllers

**Files:**
- Create: `backend/src/simulation/simulation.module.ts`
- Create: `backend/src/simulation/simulation.service.ts`
- Create: `backend/src/simulation/simulation.controller.ts`
- Create: `backend/src/simulation/fixed-expense.service.ts`
- Create: `backend/src/simulation/fixed-expense.controller.ts`
- Create: `backend/src/simulation/fixed-revenue.service.ts`
- Create: `backend/src/simulation/fixed-revenue.controller.ts`
- Create: `backend/src/simulation/dto/create-simulation.dto.ts`
- Create: `backend/src/simulation/dto/update-simulation.dto.ts`
- Modify: `backend/src/app.module.ts`

#### DTOs

**create-simulation.dto.ts:**
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSimulationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  month: string; // YYYY-MM
}
```

**update-simulation.dto.ts:**
```typescript
import { IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSimProductDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;
}

export class UpdateSimExpenseDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class UpdateSimulationDto {
  @IsOptional()
  @IsNumber()
  kdvRate?: number;

  @IsOptional()
  @IsNumber()
  incomeTaxRate?: number;

  @IsOptional()
  @IsArray()
  products?: UpdateSimProductDto[];

  @IsOptional()
  @IsArray()
  expenses?: UpdateSimExpenseDto[];
}
```

#### fixed-expense.service.ts
- `findAll(restaurantId)` - list all, ordered by sortOrder
- `create(restaurantId, { name, amount })` - create with unique check
- `update(id, restaurantId, { name?, amount? })` - update
- `remove(id, restaurantId)` - delete

#### fixed-expense.controller.ts
- `GET /sim-fixed-expenses` - list
- `POST /sim-fixed-expenses` - create
- `PATCH /sim-fixed-expenses/:id` - update
- `DELETE /sim-fixed-expenses/:id` - delete
- Guards: JwtAuthGuard, RestaurantGuard, RolesGuard
- Roles: ADMIN

#### fixed-revenue.service.ts
- `findAll(restaurantId)` - list with product info (name, price)
- `upsert(restaurantId, { productId, quantity })` - create or update
- `remove(id, restaurantId)` - delete

#### fixed-revenue.controller.ts
- `GET /sim-fixed-revenues` - list
- `POST /sim-fixed-revenues` - upsert
- `DELETE /sim-fixed-revenues/:id` - delete
- Guards: JwtAuthGuard, RestaurantGuard, RolesGuard
- Roles: ADMIN

#### simulation.service.ts
Key methods:
- `findAll(restaurantId)` - list simulations (id, name, month, createdAt)
- `findById(id, restaurantId)` - full simulation with products and expenses
- `create(restaurantId, dto)` - creates simulation and auto-populates:
  1. Copy SimFixedExpense → SimulationExpense (type: FIXED)
  2. Copy active Personnel salaries → SimulationExpense (type: PERSONNEL)
  3. Copy SimFixedRevenue → SimulationProduct (with product price + calculated cost from ProductService)
  4. Calculate food costs → SimulationExpense (type: FOOD_COST) per product
- `update(id, restaurantId, dto)` - batch update products, expenses, rates. Recalculate FOOD_COST expenses when product quantities change.
- `remove(id, restaurantId)` - delete (cascade deletes products/expenses)

#### simulation.controller.ts
- `GET /simulations` - list
- `GET /simulations/:id` - detail
- `POST /simulations` - create
- `PATCH /simulations/:id` - update
- `DELETE /simulations/:id` - delete
- Guards: JwtAuthGuard, RestaurantGuard, RolesGuard
- Roles: ADMIN

#### simulation.module.ts
```typescript
@Module({
  imports: [ProductModule], // need ProductService.calculateCost
  controllers: [SimulationController, FixedExpenseController, FixedRevenueController],
  providers: [SimulationService, FixedExpenseService, FixedRevenueService],
})
export class SimulationModule {}
```

#### app.module.ts
Add `SimulationModule` to imports.

- [ ] **Step 1: Create all backend files**
- [ ] **Step 2: Verify compilation: `cd backend && npx tsc --noEmit`**
- [ ] **Step 3: Commit**

```bash
git add backend/src/simulation/ backend/src/app.module.ts
git commit -m "feat: add simulation module backend (templates + CRUD)"
```

---

## Chunk 3: Frontend - Sidebar + Template Pages

### Task 3: Add Simulation to sidebar

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`

Add menu item:
```typescript
{ href: '/dashboard/simulation', label: 'Simulasyon', icon: Calculator }
```
Import `Calculator` from lucide-react.

### Task 4: Fixed Expenses template page

**Files:**
- Create: `frontend/src/app/dashboard/simulation/fixed-expenses/page.tsx`

Simple CRUD page:
- List of fixed expense items (name + amount)
- Add new: name input + amount input + "Ekle" button
- Each row: name, amount (editable), delete button
- API: GET/POST/PATCH/DELETE `/sim-fixed-expenses`

### Task 5: Fixed Revenues template page

**Files:**
- Create: `frontend/src/app/dashboard/simulation/fixed-revenues/page.tsx`

- Fetch menu products (isMenuItem: true) from GET /products
- Show product select dropdown + quantity input + "Ekle" button
- List: product name, quantity, delete button
- API: GET/POST/DELETE `/sim-fixed-revenues`

### Task 6: Simulation list page

**Files:**
- Create: `frontend/src/app/dashboard/simulation/page.tsx`

- List saved simulations (name, month, createdAt)
- "Yeni Simulasyon" button → dialog with name + month input
- Click simulation → navigate to detail page
- Delete button per simulation
- Tabs/buttons for "Sabit Giderler" and "Sabit Gelirler" navigation

- [ ] **Step 1: Create all frontend pages**
- [ ] **Step 2: Commit**

```bash
git add frontend/src/
git commit -m "feat: add simulation sidebar, templates, and list pages"
```

---

## Chunk 4: Frontend - Simulation Detail Page

### Task 7: Simulation detail/edit page

**Files:**
- Create: `frontend/src/app/dashboard/simulation/[id]/page.tsx`

This is the main simulation page with:

**Layout:** Two-column (mobile: stacked)
- Left: Gelirler (revenues) - product list with quantities
- Right: Giderler (expenses) - personnel, fixed, food costs

**Top bar:**
- Simulation name + month
- "Urun Fiyatlari" button → opens dialog showing all simulation products with editable salePrice and costPrice
- "Kaydet" button

**Left column (Gelirler):**
- Table: Ürün | Adet | Birim Fiyat | Toplam
- Adet is editable (input number)
- Birim Fiyat shown but not inline-editable (change via "Urun Fiyatlari" dialog)
- Toplam = adet × birimFiyat (calculated)

**Right column (Giderler):**
- Section 1: Personel Giderleri (PERSONNEL type) - readonly
- Section 2: Sabit Giderler (FIXED type) - amount editable
- Section 3: Gida Maliyetleri (FOOD_COST type) - auto-calculated, readonly

**Bottom summary (full width):**
```
Toplam Ciro (KDV dahil):     ₺XX
Toplam Gider (KDV dahil):    ₺XX
Brüt Kar:                    ₺XX
─────────────────────────────
KDV Oranı: [%10] (editable)
KDV Geliri:                  ₺XX
KDV Gideri:                  ₺XX
─────────────────────────────
Gelir Vergisi Oranı: [%20] (editable)
Gelir Vergisi:               ₺XX
─────────────────────────────
NET Kar:                     ₺XX
```

**"Urun Fiyatlari" dialog:**
- Table of all SimulationProduct records
- Columns: Ürün | Satış Fiyatı (editable) | Maliyet Fiyatı (editable)
- Changes are local state, saved with main "Kaydet"

**Save logic:**
- Collect all changed products (quantity, salePrice, costPrice)
- Collect all changed expenses (amount for FIXED type)
- Collect kdvRate, incomeTaxRate if changed
- PATCH /simulations/:id with the changes
- Backend recalculates FOOD_COST expenses based on new quantities/costPrices

**All calculations done in frontend for instant feedback.**

- [ ] **Step 1: Create simulation detail page**
- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/simulation/
git commit -m "feat: add simulation detail page with real-time calculations"
```
