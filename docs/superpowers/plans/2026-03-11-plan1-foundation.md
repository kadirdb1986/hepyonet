# Plan 1: Foundation — Project Setup, Auth, Restaurant, Users, Super Admin

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational infrastructure — monorepo scaffold, database schema, authentication, restaurant management, user/role system, super admin panel, and frontend scaffold with auth pages.

**Architecture:** Monorepo with `backend/` (NestJS) and `frontend/` (Next.js). Backend handles all business logic via REST API. Supabase provides hosted PostgreSQL and auth service, managed server-side through NestJS. Frontend communicates exclusively through NestJS API.

**Tech Stack:** NestJS, Next.js, Prisma, PostgreSQL (Supabase), Supabase Auth (server-side), Tailwind CSS, shadcn/ui, Zustand, TanStack Query, next-intl

**Spec:** `docs/superpowers/specs/2026-03-11-hepyonet-design.md`

**Note on testing:** E2e and unit tests are deferred to a separate testing plan to keep this foundation plan focused. Test file paths are not listed in the file structure.

**Note on spec deviation:** The spec lists `password` on the User model. We intentionally store passwords only in Supabase Auth and not in our database — this is a security best practice.

**Related Plans:**
- Plan 2: Personnel (HR) Module
- Plan 3: Finance Module
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module
- Plan 6: Reporting Module

---

## File Structure

```
hepyonet/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── nest-cli.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── supabase/
│   │   │   ├── supabase.module.ts
│   │   │   └── supabase.service.ts
│   │   ├── common/
│   │   │   ├── enums/
│   │   │   │   └── role.enum.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   └── restaurant.guard.ts
│   │   │   └── decorators/
│   │   │       ├── roles.decorator.ts
│   │   │       └── current-user.decorator.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       └── login.dto.ts
│   │   ├── restaurant/
│   │   │   ├── restaurant.module.ts
│   │   │   ├── restaurant.controller.ts
│   │   │   ├── restaurant.service.ts
│   │   │   └── dto/
│   │   │       └── update-restaurant.dto.ts
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-role.dto.ts
│   │   └── admin/
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts
│   │       └── guards/
│   │           └── super-admin.guard.ts
│   └── package.json
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   ├── messages/
│   │   └── tr.json
│   ├── src/
│   │   ├── middleware.ts
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   └── admin/
│   │   │       ├── login/
│   │   │       │   └── page.tsx
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       └── restaurants/
│   │   │           └── page.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── stores/
│   │   │   └── auth-store.ts
│   │   ├── hooks/
│   │   │   └── use-auth.ts
│   │   ├── components/
│   │   │   ├── providers/
│   │   │   │   └── query-provider.tsx
│   │   │   └── layout/
│   │   │       ├── sidebar.tsx
│   │   │       └── header.tsx
│   │   └── i18n/
│   │       ├── config.ts
│   │       └── request.ts
│   └── package.json
└── .gitignore
```

---

## Chunk 1: Backend Project Setup + Database

### Task 1: Initialize monorepo and backend project

**Files:**
- Create: `.gitignore`
- Create: `backend/` (NestJS scaffold)
- Create: `backend/.env.example`

- [ ] **Step 1: Create root .gitignore**

```gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage/
.next/
```

- [ ] **Step 2: Scaffold NestJS backend**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
npx @nestjs/cli new backend --package-manager npm --skip-git
```

- [ ] **Step 3: Install backend dependencies**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm install @prisma/client @supabase/supabase-js class-validator class-transformer @nestjs/config @nestjs/passport passport passport-jwt @nestjs/jwt @nestjs/throttler
npm install -D prisma @types/passport-jwt ts-node
```

- [ ] **Step 4: Create .env.example**

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/hepyonet?schema=public"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold NestJS backend project with dependencies"
```

---

### Task 2: Setup Prisma schema with all models

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npx prisma init
```

- [ ] **Step 2: Write the Prisma schema**

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  ACCOUNTANT
  HR
  STOCK_MANAGER
  MENU_MANAGER
}

enum RestaurantStatus {
  PENDING
  APPROVED
  REJECTED
}

model Restaurant {
  id               String           @id @default(uuid())
  name             String
  slug             String           @unique
  logo             String?
  address          String?
  phone            String?
  status           RestaurantStatus @default(PENDING)
  subscriptionPlan String           @default("free")
  settings         Json             @default("{}")
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  users          User[]
  personnel      Personnel[]
  expenses       Expense[]
  revenues       Revenue[]
  rawMaterials   RawMaterial[]
  products       Product[]
  menuItems      MenuItem[]
  stockMovements StockMovement[]

  @@map("restaurants")
}

model User {
  id           String   @id @default(uuid())
  supabaseId   String   @unique
  email        String   @unique
  name         String
  restaurantId String?
  role         Role     @default(ADMIN)
  isActive     Boolean  @default(true)
  isSuperAdmin Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant Restaurant? @relation(fields: [restaurantId], references: [id])

  @@map("users")
}

// Below models are stubs for relations — will be fully implemented in later plans

model Personnel {
  id           String   @id @default(uuid())
  restaurantId String
  name         String
  surname      String
  phone        String?
  tcNo         String?
  position     String?
  startDate    DateTime
  salary       Decimal  @db.Decimal(10, 2)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant   Restaurant    @relation(fields: [restaurantId], references: [id])
  leaveRecords LeaveRecord[]

  @@map("personnel")
}

enum LeaveType {
  ANNUAL
  SICK
  OTHER
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

model LeaveRecord {
  id           String      @id @default(uuid())
  restaurantId String
  personnelId  String
  startDate    DateTime
  endDate      DateTime
  type         LeaveType
  status       LeaveStatus @default(PENDING)
  notes        String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  personnel Personnel @relation(fields: [personnelId], references: [id])

  @@map("leave_records")
}

enum ExpenseCategory {
  SALARY
  BILL
  TAX
  RENT
  SUPPLIER
  OTHER
}

enum DistributionType {
  NONE
  EQUAL
  REVENUE_BASED
}

model Expense {
  id                 String           @id @default(uuid())
  restaurantId       String
  title              String
  amount             Decimal          @db.Decimal(10, 2)
  category           ExpenseCategory
  paymentDate        DateTime
  isDistributed      Boolean          @default(false)
  distributionType   DistributionType @default(NONE)
  distributionMonths Int?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  restaurant    Restaurant             @relation(fields: [restaurantId], references: [id])
  distributions ExpenseDistribution[]

  @@map("expenses")
}

model ExpenseDistribution {
  id        String  @id @default(uuid())
  expenseId String
  month     String  // YYYY-MM format
  amount    Decimal @db.Decimal(10, 2)

  expense Expense @relation(fields: [expenseId], references: [id])

  @@map("expense_distributions")
}

enum RevenueSource {
  MANUAL
  API
}

model Revenue {
  id           String        @id @default(uuid())
  restaurantId String
  date         DateTime
  amount       Decimal       @db.Decimal(10, 2)
  source       RevenueSource @default(MANUAL)
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@map("revenues")
}

enum MaterialUnit {
  KG
  GR
  LT
  ML
  ADET
}

model RawMaterial {
  id                String       @id @default(uuid())
  restaurantId      String
  name              String
  unit              MaterialUnit
  currentStock      Decimal      @db.Decimal(10, 3) @default(0)
  lastPurchasePrice Decimal      @db.Decimal(10, 2) @default(0)
  minStockLevel     Decimal      @db.Decimal(10, 3) @default(0)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  restaurant     Restaurant          @relation(fields: [restaurantId], references: [id])
  stockMovements StockMovement[]
  ingredients    ProductIngredient[]

  @@map("raw_materials")
}

model Product {
  id           String  @id @default(uuid())
  restaurantId String
  name         String
  code         String?
  description  String?
  image        String?
  price        Decimal @db.Decimal(10, 2) @default(0)
  isMenuItem   Boolean @default(false)
  isComposite  Boolean @default(false)
  category     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant  Restaurant          @relation(fields: [restaurantId], references: [id])
  ingredients ProductIngredient[] @relation("ProductIngredients")
  usedIn      ProductIngredient[] @relation("SubProductIngredients")
  menuItem    MenuItem?

  @@map("products")
}

model ProductIngredient {
  id            String  @id @default(uuid())
  productId     String
  rawMaterialId String?
  subProductId  String?
  quantity      Decimal @db.Decimal(10, 3)
  unit          String

  product     Product      @relation("ProductIngredients", fields: [productId], references: [id])
  rawMaterial RawMaterial? @relation(fields: [rawMaterialId], references: [id])
  subProduct  Product?     @relation("SubProductIngredients", fields: [subProductId], references: [id])

  @@map("product_ingredients")
}

model MenuItem {
  id           String  @id @default(uuid())
  productId    String  @unique
  restaurantId String
  displayOrder Int     @default(0)
  isAvailable  Boolean @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  product    Product    @relation(fields: [productId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@map("menu_items")
}

enum StockMovementType {
  IN
  OUT
}

model StockMovement {
  id            String            @id @default(uuid())
  restaurantId  String
  rawMaterialId String
  quantity      Decimal           @db.Decimal(10, 3)
  unitPrice     Decimal           @db.Decimal(10, 2)
  type          StockMovementType
  supplier      String?
  invoiceNo     String?
  date          DateTime
  createdAt     DateTime          @default(now())

  restaurant  Restaurant  @relation(fields: [restaurantId], references: [id])
  rawMaterial RawMaterial @relation(fields: [rawMaterialId], references: [id])

  @@map("stock_movements")
}
```

- [ ] **Step 3: Generate Prisma client**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npx prisma generate
```
Expected: "Generated Prisma Client"

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add complete Prisma schema with all models"
```

---

### Task 3: Create PrismaService and SupabaseService

**Files:**
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/src/supabase/supabase.service.ts`
- Create: `backend/src/supabase/supabase.module.ts`

- [ ] **Step 1: Write PrismaService**

```typescript
// backend/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Write PrismaModule**

```typescript
// backend/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Write SupabaseService (shared singleton)**

```typescript
// backend/src/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.client = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
```

- [ ] **Step 4: Write SupabaseModule**

```typescript
// backend/src/supabase/supabase.module.ts
import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
```

- [ ] **Step 5: Update AppModule**

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SupabaseModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Update main.ts**

```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(configService.get<number>('PORT', 3001));
}
bootstrap();
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 8: Commit**

```bash
git add backend/src/prisma/ backend/src/supabase/ backend/src/app.module.ts backend/src/main.ts
git commit -m "feat: add PrismaModule, SupabaseModule, configure AppModule and main.ts"
```

---

## Chunk 2: Auth System

### Task 4: Create common enums, decorators, and guards

**Files:**
- Create: `backend/src/common/enums/role.enum.ts`
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Create: `backend/src/common/guards/restaurant.guard.ts`

- [ ] **Step 1: Create Role enum re-export**

```typescript
// backend/src/common/enums/role.enum.ts
export { Role } from '@prisma/client';
```

- [ ] **Step 2: Create CurrentUser decorator**

```typescript
// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);
```

- [ ] **Step 3: Create Roles decorator**

```typescript
// backend/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 4: Create JwtAuthGuard (uses shared SupabaseService)**

```typescript
// backend/src/common/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    const supabase = this.supabaseService.getClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    request.user = user;
    return true;
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
```

- [ ] **Step 5: Create RolesGuard**

```typescript
// backend/src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Super admin can access everything
    if (user.isSuperAdmin) {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
```

- [ ] **Step 6: Create RestaurantGuard**

```typescript
// backend/src/common/guards/restaurant.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RestaurantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass restaurant check
    if (user?.isSuperAdmin) {
      return true;
    }

    if (!user?.restaurantId) {
      throw new ForbiddenException('No restaurant associated');
    }

    if (user.restaurant?.status !== 'APPROVED') {
      throw new ForbiddenException('Restaurant not approved yet');
    }

    return true;
  }
}
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add backend/src/common/
git commit -m "feat: add common enums, decorators, and guards (JWT, Roles, Restaurant)"
```

---

### Task 5: Create Auth module (register, login, refresh, forgot-password, me)

**Files:**
- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`

- [ ] **Step 1: Create RegisterDto**

```typescript
// backend/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  restaurantName: string;
}
```

- [ ] **Step 2: Create LoginDto**

```typescript
// backend/src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

- [ ] **Step 3: Create AuthService**

```typescript
// backend/src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const supabase = this.supabaseService.getClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    const slug = this.generateSlug(dto.restaurantName);

    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName,
          slug,
          status: 'PENDING',
        },
      });

      const user = await tx.user.create({
        data: {
          supabaseId: authData.user.id,
          email: dto.email,
          name: dto.name,
          restaurantId: restaurant.id,
          role: 'ADMIN',
        },
      });

      return { restaurant, user };
    });

    return {
      message: 'Registration successful. Your restaurant is pending approval.',
      restaurantId: result.restaurant.id,
      userId: result.user.id,
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { supabaseId: data.user.id },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: this.formatUserResponse(user),
    };
  }

  async refreshToken(refreshToken: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async forgotPassword(email: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Password reset email sent' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { restaurant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUserResponse(user);
  }

  private formatUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      restaurant: user.restaurant
        ? {
            id: user.restaurant.id,
            name: user.restaurant.name,
            slug: user.restaurant.slug,
            status: user.restaurant.status,
          }
        : null,
    };
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }
}
```

- [ ] **Step 4: Create AuthController**

```typescript
// backend/src/auth/auth.controller.ts
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
```

- [ ] **Step 5: Create AuthModule and register in AppModule**

```typescript
// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SupabaseModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add backend/src/auth/ backend/src/app.module.ts
git commit -m "feat: add Auth module with register, login, refresh, forgot-password, and me endpoint"
```

---

## Chunk 3: Restaurant + User Management

### Task 6: Create Restaurant module

**Files:**
- Create: `backend/src/restaurant/dto/update-restaurant.dto.ts`
- Create: `backend/src/restaurant/restaurant.service.ts`
- Create: `backend/src/restaurant/restaurant.controller.ts`
- Create: `backend/src/restaurant/restaurant.module.ts`

- [ ] **Step 1: Create UpdateRestaurantDto**

```typescript
// backend/src/restaurant/dto/update-restaurant.dto.ts
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateRestaurantSettingsDto {
  @IsObject()
  settings: Record<string, any>;
}
```

- [ ] **Step 2: Create RestaurantService**

```typescript
// backend/src/restaurant/restaurant.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
  }

  async updateSettings(id: string, dto: UpdateRestaurantSettingsDto) {
    return this.prisma.restaurant.update({
      where: { id },
      data: { settings: dto.settings },
    });
  }
}
```

- [ ] **Step 3: Create RestaurantController**

```typescript
// backend/src/restaurant/restaurant.controller.ts
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Get()
  @Roles(Role.ADMIN)
  getMyRestaurant(@CurrentUser('restaurantId') restaurantId: string) {
    return this.restaurantService.findById(restaurantId);
  }

  @Patch()
  @Roles(Role.ADMIN)
  updateRestaurant(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(restaurantId, dto);
  }

  @Patch('settings')
  @Roles(Role.ADMIN)
  updateSettings(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantSettingsDto,
  ) {
    return this.restaurantService.updateSettings(restaurantId, dto);
  }
}
```

- [ ] **Step 4: Create RestaurantModule and register in AppModule**

```typescript
// backend/src/restaurant/restaurant.module.ts
import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
```

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    RestaurantModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurant/ backend/src/app.module.ts
git commit -m "feat: add Restaurant module with CRUD endpoints"
```

---

### Task 7: Create User module

**Files:**
- Create: `backend/src/user/dto/create-user.dto.ts`
- Create: `backend/src/user/dto/update-role.dto.ts`
- Create: `backend/src/user/user.service.ts`
- Create: `backend/src/user/user.controller.ts`
- Create: `backend/src/user/user.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// backend/src/user/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Role)
  role: Role;
}
```

```typescript
// backend/src/user/dto/update-role.dto.ts
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}
```

- [ ] **Step 2: Create UserService (uses shared SupabaseService)**

```typescript
// backend/src/user/user.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async create(restaurantId: string, dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const supabase = this.supabaseService.getClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    return this.prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: dto.email,
        name: dto.name,
        restaurantId,
        role: dto.role,
      },
    });
  }

  async findAllByRestaurant(restaurantId: string) {
    return this.prisma.user.findMany({
      where: { restaurantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateRole(id: string, restaurantId: string, dto: UpdateRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });
  }

  async deactivate(id: string, restaurantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
```

- [ ] **Step 3: Create UserController**

```typescript
// backend/src/user/user.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.userService.create(restaurantId, dto);
  }

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.userService.findAllByRestaurant(restaurantId);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.userService.updateRole(id, restaurantId, dto);
  }

  @Delete(':id')
  deactivate(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.userService.deactivate(id, restaurantId);
  }
}
```

- [ ] **Step 4: Create UserModule and register in AppModule**

```typescript
// backend/src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    RestaurantModule,
    UserModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add backend/src/user/ backend/src/app.module.ts
git commit -m "feat: add User module with create, list, role update, and deactivate"
```

---

## Chunk 4: Super Admin + Seed

### Task 8: Create Super Admin module

**Files:**
- Create: `backend/src/admin/guards/super-admin.guard.ts`
- Create: `backend/src/admin/admin.service.ts`
- Create: `backend/src/admin/admin.controller.ts`
- Create: `backend/src/admin/admin.module.ts`

- [ ] **Step 1: Create SuperAdminGuard**

```typescript
// backend/src/admin/guards/super-admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
```

- [ ] **Step 2: Create AdminService**

```typescript
// backend/src/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getRestaurants(status?: RestaurantStatus) {
    const where = status ? { status } : {};
    return this.prisma.restaurant.findMany({
      where,
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, email: true, name: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRestaurant(id: string, status: RestaurantStatus) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: { status },
    });
  }

  async getStats() {
    const [totalRestaurants, pendingRestaurants, approvedRestaurants, totalUsers] =
      await Promise.all([
        this.prisma.restaurant.count(),
        this.prisma.restaurant.count({ where: { status: 'PENDING' } }),
        this.prisma.restaurant.count({ where: { status: 'APPROVED' } }),
        this.prisma.user.count(),
      ]);

    return {
      totalRestaurants,
      pendingRestaurants,
      approvedRestaurants,
      totalUsers,
    };
  }
}
```

- [ ] **Step 3: Create AdminController**

```typescript
// backend/src/admin/admin.controller.ts
import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { RestaurantStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('restaurants')
  getRestaurants(@Query('status') status?: RestaurantStatus) {
    return this.adminService.getRestaurants(status);
  }

  @Patch('restaurants/:id/approve')
  approveRestaurant(
    @Param('id') id: string,
    @Body('status') status: RestaurantStatus,
  ) {
    return this.adminService.approveRestaurant(id, status);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
```

- [ ] **Step 4: Create AdminModule and register in AppModule**

```typescript
// backend/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

```typescript
// backend/src/app.module.ts — FINAL VERSION
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    RestaurantModule,
    UserModule,
    AdminModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add backend/src/admin/ backend/src/app.module.ts
git commit -m "feat: add Super Admin module with restaurant approval and stats"
```

---

### Task 9: Create seed script for initial super admin

**Files:**
- Create: `backend/prisma/seed.ts`
- Modify: `backend/package.json` (add prisma seed config)

- [ ] **Step 1: Create seed script**

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
  });

  if (existingAdmin) {
    console.log('Super admin already exists:', existingAdmin.email);
    return;
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@hepyonet.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create Supabase auth user:', authError.message);
    process.exit(1);
  }

  // Create super admin user (no restaurant needed)
  const user = await prisma.user.create({
    data: {
      supabaseId: authData.user.id,
      email: adminEmail,
      name: 'Super Admin',
      isSuperAdmin: true,
      restaurantId: null,
    },
  });

  console.log('Super admin created:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed config to package.json**

Add to `backend/package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run seed (after database is set up)**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npx prisma db seed
```
Expected: "Super admin created: admin@hepyonet.com"

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed.ts backend/package.json
git commit -m "feat: add seed script for initial super admin user"
```

---

## Chunk 5: Frontend Setup

### Task 10: Initialize Next.js frontend

**Files:**
- Create: `frontend/` (Next.js scaffold)
- Create: `frontend/.env.example`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git
```

- [ ] **Step 2: Install frontend dependencies**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm install zustand @tanstack/react-query axios recharts next-intl lucide-react
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npx shadcn@latest init -d
npx shadcn@latest add button input label card table badge dialog dropdown-menu separator sheet toast form
```

Note: `shadcn init` creates `src/lib/utils.ts` with the `cn` helper automatically.

- [ ] **Step 4: Create .env.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend with shadcn/ui and dependencies"
```

---

### Task 11: Setup i18n, next.config.ts, and API client

**Files:**
- Create: `frontend/src/i18n/config.ts`
- Create: `frontend/src/i18n/request.ts`
- Create: `frontend/messages/tr.json`
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Create i18n config**

```typescript
// frontend/src/i18n/config.ts
export const locales = ['tr', 'en'] as const;
export const defaultLocale = 'tr' as const;
export type Locale = (typeof locales)[number];
```

```typescript
// frontend/src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 2: Update next.config.ts with next-intl plugin**

```typescript
// frontend/next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 3: Create Turkish translations**

```json
{
  "common": {
    "appName": "HepYonet",
    "loading": "Yukleniyor...",
    "save": "Kaydet",
    "cancel": "Iptal",
    "delete": "Sil",
    "edit": "Duzenle",
    "add": "Ekle",
    "search": "Ara",
    "actions": "Islemler",
    "confirm": "Onayla",
    "reject": "Reddet",
    "back": "Geri",
    "next": "Ileri",
    "yes": "Evet",
    "no": "Hayir"
  },
  "auth": {
    "login": "Giris Yap",
    "register": "Kayit Ol",
    "email": "E-posta",
    "password": "Sifre",
    "name": "Ad Soyad",
    "restaurantName": "Restoran Adi",
    "forgotPassword": "Sifremi Unuttum",
    "noAccount": "Hesabiniz yok mu?",
    "hasAccount": "Zaten hesabiniz var mi?",
    "registerSuccess": "Kayit basarili! Restoraniniz onay bekliyor.",
    "loginError": "E-posta veya sifre hatali.",
    "logout": "Cikis Yap"
  },
  "dashboard": {
    "title": "Genel Bakis",
    "welcome": "Hos geldiniz",
    "monthlyRevenue": "Aylik Ciro",
    "monthlyExpense": "Aylik Gider",
    "netProfit": "Net Kar",
    "personnelCount": "Personel Sayisi"
  },
  "nav": {
    "dashboard": "Panel",
    "personnel": "Personel",
    "finance": "Finans",
    "inventory": "Stok",
    "products": "Urunler",
    "menu": "Menu",
    "reports": "Raporlar",
    "settings": "Ayarlar",
    "users": "Kullanicilar"
  },
  "admin": {
    "title": "Yonetim Paneli",
    "restaurants": "Restoranlar",
    "pendingApproval": "Onay Bekleyenler",
    "approved": "Onaylananlar",
    "rejected": "Reddedilenler",
    "approve": "Onayla",
    "reject": "Reddet",
    "stats": "Istatistikler",
    "totalRestaurants": "Toplam Restoran",
    "totalUsers": "Toplam Kullanici"
  },
  "restaurant": {
    "status": {
      "PENDING": "Onay Bekliyor",
      "APPROVED": "Onaylandi",
      "REJECTED": "Reddedildi"
    }
  }
}
```

Save this file to `frontend/messages/tr.json`.

- [ ] **Step 4: Create API client**

```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken },
          );
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/ frontend/messages/ frontend/src/lib/ frontend/next.config.ts
git commit -m "feat: add i18n setup, next-intl plugin, API client with token refresh"
```

---

### Task 12: Create auth store, useAuth hook, and auth pages

**Files:**
- Create: `frontend/src/stores/auth-store.ts`
- Create: `frontend/src/hooks/use-auth.ts`
- Create: `frontend/src/app/auth/login/page.tsx`
- Create: `frontend/src/app/auth/register/page.tsx`

- [ ] **Step 1: Create auth store (Zustand)**

```typescript
// frontend/src/stores/auth-store.ts
import { create } from 'zustand';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  restaurant: Restaurant | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
```

- [ ] **Step 2: Create useAuth hook (with checkAuth using /auth/me)**

```typescript
// frontend/src/hooks/use-auth.ts
'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import { useEffect } from 'react';

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout: clearAuth } = useAuthStore();

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const register = async (payload: {
    email: string;
    password: string;
    name: string;
    restaurantName: string;
  }) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const logout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      clearAuth();
    }
  };

  // Auto-check auth on mount
  useEffect(() => {
    if (isLoading && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  return { user, isAuthenticated, isLoading, login, register, logout, checkAuth };
}
```

- [ ] **Step 3: Create login page**

```tsx
// frontend/src/app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giris basarisiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">HepYonet</CardTitle>
          <CardDescription>Hesabiniza giris yapin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Sifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Hesabiniz yok mu?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                Kayit Ol
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create register page**

```tsx
// frontend/src/app/auth/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    restaurantName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register(form);
      setSuccess('Kayit basarili! Restoraniniz onay bekliyor.');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayit basarisiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">HepYonet</CardTitle>
          <CardDescription>Yeni restoran kaydi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                {success}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Sifre</Label>
              <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} minLength={6} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Restoran Adi</Label>
              <Input id="restaurantName" name="restaurantName" value={form.restaurantName} onChange={handleChange} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Kayit yapiliyor...' : 'Kayit Ol'}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Zaten hesabiniz var mi?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Giris Yap
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/ frontend/src/hooks/ frontend/src/app/auth/
git commit -m "feat: add auth store, useAuth hook, login and register pages"
```

---

### Task 13: Create dashboard layout (sidebar + header)

**Files:**
- Create: `frontend/src/components/layout/sidebar.tsx`
- Create: `frontend/src/components/layout/header.tsx`
- Create: `frontend/src/app/dashboard/layout.tsx`
- Create: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create sidebar component**

```tsx
// frontend/src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Package,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  Settings,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/personnel', label: 'Personel', icon: Users },
  { href: '/dashboard/finance', label: 'Finans', icon: Wallet },
  { href: '/dashboard/inventory', label: 'Stok', icon: Package },
  { href: '/dashboard/products', label: 'Urunler', icon: ChefHat },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/dashboard/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings },
  { href: '/dashboard/users', label: 'Kullanicilar', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">HepYonet</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create header component**

```tsx
// frontend/src/components/layout/header.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h2 className="text-sm text-gray-500">{user?.restaurant?.name}</h2>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <User className="h-4 w-4" />
            {user?.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={logout} className="text-red-600">
            <LogOut className="h-4 w-4 mr-2" />
            Cikis Yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 3: Create dashboard layout**

```tsx
// frontend/src/app/dashboard/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create dashboard home page**

```tsx
// frontend/src/app/dashboard/page.tsx
'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, TrendingUp, Users } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const summaryCards = [
    { title: 'Aylik Ciro', value: '\u2014', icon: Wallet, color: 'text-green-600' },
    { title: 'Aylik Gider', value: '\u2014', icon: TrendingDown, color: 'text-red-600' },
    { title: 'Net Kar', value: '\u2014', icon: TrendingUp, color: 'text-blue-600' },
    { title: 'Personel', value: '\u2014', icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Hos geldiniz, {user?.name}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/app/dashboard/
git commit -m "feat: add dashboard layout with sidebar, header, and summary cards"
```

---

### Task 14: Create super admin pages

**Files:**
- Create: `frontend/src/app/admin/login/page.tsx`
- Create: `frontend/src/app/admin/layout.tsx`
- Create: `frontend/src/app/admin/page.tsx`
- Create: `frontend/src/app/admin/restaurants/page.tsx`

- [ ] **Step 1: Create admin login page**

```tsx
// frontend/src/app/admin/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giris basarisiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">HepYonet Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Sifre</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create admin layout (hooks rule fixed — useEffect before early return)**

```tsx
// frontend/src/app/admin/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { LayoutDashboard, Store, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const adminMenuItems = [
  { href: '/admin', label: 'Istatistikler', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restoranlar', icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router, isLoginPage]);

  // Don't wrap the login page in admin layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <aside className="w-64 border-r border-gray-700 bg-gray-800 h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">HepYonet Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <Button
            variant="ghost"
            className="w-full text-gray-400 hover:text-white justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Cikis Yap
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 text-white">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard page**

```tsx
// frontend/src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Users, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Stats {
  totalRestaurants: number;
  pendingRestaurants: number;
  approvedRestaurants: number;
  totalUsers: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(console.error);
  }, []);

  if (!stats) return <p>Yukleniyor...</p>;

  const cards = [
    { title: 'Toplam Restoran', value: stats.totalRestaurants, icon: Store },
    { title: 'Onay Bekleyen', value: stats.pendingRestaurants, icon: Clock },
    { title: 'Onaylanan', value: stats.approvedRestaurants, icon: Store },
    { title: 'Toplam Kullanici', value: stats.totalUsers, icon: Users },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Istatistikler</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">{card.title}</CardTitle>
              <card.icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create restaurants management page**

```tsx
// frontend/src/app/admin/restaurants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  users: { id: string; email: string; name: string }[];
}

const statusMap = {
  PENDING: { label: 'Onay Bekliyor', variant: 'secondary' as const },
  APPROVED: { label: 'Onaylandi', variant: 'default' as const },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' as const },
};

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<string>('');

  const loadRestaurants = () => {
    const params = filter ? { status: filter } : {};
    api.get('/admin/restaurants', { params }).then(({ data }) => setRestaurants(data));
  };

  useEffect(() => {
    loadRestaurants();
  }, [filter]);

  const handleStatusChange = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await api.patch(`/admin/restaurants/${id}/approve`, { status });
    loadRestaurants();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Restoranlar</h1>
      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className={filter !== s ? 'border-gray-600 text-gray-300' : ''}
          >
            {s === '' ? 'Tumu' : statusMap[s as keyof typeof statusMap].label}
          </Button>
        ))}
      </div>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Restoran</TableHead>
              <TableHead className="text-gray-400">Yonetici</TableHead>
              <TableHead className="text-gray-400">Durum</TableHead>
              <TableHead className="text-gray-400">Kayit Tarihi</TableHead>
              <TableHead className="text-gray-400">Islemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map((r) => (
              <TableRow key={r.id} className="border-gray-700">
                <TableCell className="text-white font-medium">{r.name}</TableCell>
                <TableCell className="text-gray-300">
                  {r.users[0]?.name} ({r.users[0]?.email})
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[r.status].variant}>
                    {statusMap[r.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300">
                  {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                </TableCell>
                <TableCell>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleStatusChange(r.id, 'APPROVED')}>
                        Onayla
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(r.id, 'REJECTED')}>
                        Reddet
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/
git commit -m "feat: add super admin pages - login, dashboard stats, restaurant management"
```

---

## Chunk 6: Integration and Final Wiring

### Task 15: Root-level configuration and final wiring

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/components/providers/query-provider.tsx`
- Create: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create QueryProvider**

```tsx
// frontend/src/components/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Update root layout**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HepYonet - Restoran Yonetim Sistemi',
  description: 'Restoranlar icin SaaS yonetim platformu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create landing page (redirect)**

```tsx
// frontend/src/app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/auth/login');
}
```

- [ ] **Step 4: Verify both projects build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend && npm run build
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend && npm run build
```
Expected: Both builds succeed

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/page.tsx frontend/src/components/providers/
git commit -m "feat: add root layout with QueryProvider, landing page redirect"
```

---

## Summary

This plan establishes:
- **Backend:** NestJS with Prisma, shared SupabaseService, complete database schema, Auth (register/login/refresh/forgot-password/me), Restaurant CRUD, User management with roles, Super Admin module, seed script
- **Frontend:** Next.js with shadcn/ui, next-intl i18n, auth pages (login/register), dashboard layout (sidebar + header + summary cards), super admin panel (stats + restaurant approval)
- **Security:** JWT auth via Supabase, Role-based guards, Restaurant tenant isolation, Super admin guard
- **i18n:** Turkish language file, next-intl plugin configured

**Next plans to implement:**
- Plan 2: Personnel (HR) Module
- Plan 3: Finance Module (Gelir/Gider + Dagitim)
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module
- Plan 6: Reporting Module
