# Auth, Ownership & Multi-Restaurant Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login, restaurant ownership, multi-restaurant membership, and per-restaurant roles.

**Architecture:** Replace single `user.restaurantId`/`user.role` with a `RestaurantMember` join table. RestaurantGuard reads `x-restaurant-id` header and sets `restaurantId` on `request.user` so all existing `@CurrentUser('restaurantId')` usage keeps working. Google OAuth uses Supabase's Google provider with auto-provisioning in JwtAuthGuard.

**Tech Stack:** NestJS, Prisma, Supabase Auth (Google OAuth), Next.js, Zustand, Axios

**Spec:** `docs/superpowers/specs/2026-03-15-auth-ownership-multi-restaurant-design.md`

---

## Chunk 1: Database Schema & Migration

### Task 1: Update Prisma Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add MemberRole enum and RestaurantMember model**

Replace the `Role` enum and add the new model. In `backend/prisma/schema.prisma`:

Replace the existing `Role` enum (lines 9-15):

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

Add `RestaurantMember` model after the `User` model (after line 67):

```prisma
model RestaurantMember {
  id           String     @id @default(uuid())
  userId       String
  restaurantId String
  role         MemberRole
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  user       User       @relation(fields: [userId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([userId, restaurantId])
  @@map("restaurant_members")
}
```

- [ ] **Step 2: Update User model**

Replace the current `User` model (lines 52-67) with:

```prisma
model User {
  id           String   @id @default(uuid())
  supabaseId   String   @unique
  email        String   @unique
  name         String
  avatarUrl    String?
  isActive     Boolean  @default(true)
  isSuperAdmin Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships RestaurantMember[]

  @@map("users")
}
```

Note: `restaurantId` and `role` are removed. `avatarUrl` is added. The `restaurant` relation is replaced by `memberships`.

- [ ] **Step 3: Update Restaurant model**

In the `Restaurant` model, replace `users User[]` (line 36) with:

```prisma
  members RestaurantMember[]
```

- [ ] **Step 4: Add userId to Personnel model**

In the `Personnel` model, after the `isActive` field (line 79), add:

```prisma
  userId       String?
```

And add the relation after the `restaurant` relation (after line 83):

```prisma
  user         User?          @relation(fields: [userId], references: [id])
```

Also add `personnel Personnel[]` to the `User` model's relations.

- [ ] **Step 5: Generate migration with data migration SQL**

Run:
```bash
cd backend && npx prisma migrate dev --name add-restaurant-members --create-only
```

This creates the migration file without applying it. We need to add data migration SQL.

- [ ] **Step 6: Add data migration SQL to the generated migration file**

Open the generated migration file in `backend/prisma/migrations/[timestamp]_add_restaurant_members/migration.sql` and add data migration SQL BEFORE the column drops:

```sql
-- 1. Create restaurant_members from existing users
INSERT INTO "restaurant_members" ("id", "userId", "restaurantId", "role", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."id",
  u."restaurantId",
  CASE u."role"
    WHEN 'ADMIN' THEN 'ADMIN'
    WHEN 'ACCOUNTANT' THEN 'ACCOUNTANT'
    WHEN 'HR' THEN 'HR'
    WHEN 'STOCK_MANAGER' THEN 'STOCK_MANAGER'
    WHEN 'MENU_MANAGER' THEN 'MENU_MANAGER'
    ELSE 'ADMIN'
  END::"MemberRole",
  u."isActive",
  u."createdAt",
  u."updatedAt"
FROM "users" u
WHERE u."restaurantId" IS NOT NULL;

-- 2. Set first ADMIN as OWNER per restaurant, fallback to any user
WITH ranked AS (
  SELECT rm."id",
    ROW_NUMBER() OVER (
      PARTITION BY rm."restaurantId"
      ORDER BY CASE WHEN rm."role" = 'ADMIN' THEN 0 ELSE 1 END, rm."createdAt"
    ) AS rn
  FROM "restaurant_members" rm
)
UPDATE "restaurant_members"
SET "role" = 'OWNER'
FROM ranked
WHERE "restaurant_members"."id" = ranked."id" AND ranked.rn = 1;
```

- [ ] **Step 7: Apply the migration**

Run:
```bash
cd backend && npx prisma migrate dev
```

- [ ] **Step 8: Generate Prisma client**

Run:
```bash
cd backend && npx prisma generate
```

- [ ] **Step 9: Verify migration**

Run:
```bash
cd backend && npx prisma studio
```

Check that `restaurant_members` table has data, each restaurant has exactly one OWNER.

- [ ] **Step 10: Commit**

```bash
git add backend/prisma/
git commit -m "feat: add RestaurantMember table and migrate existing data"
```

---

## Chunk 2: Backend Guards, Decorators & Auth Service

### Task 2: Update RolesGuard and Roles Decorator

**Files:**
- Modify: `backend/src/common/decorators/roles.decorator.ts`
- Modify: `backend/src/common/guards/roles.guard.ts`

- [ ] **Step 1: Update roles decorator to use MemberRole**

Replace `backend/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 2: Update RolesGuard to use memberRole**

Replace `backend/src/common/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (user.isSuperAdmin) {
      return true;
    }

    // OWNER has all permissions
    if (user.memberRole === MemberRole.OWNER) {
      return true;
    }

    return requiredRoles.includes(user.memberRole);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/
git commit -m "feat: update roles guard and decorator for MemberRole"
```

### Task 3: Update RestaurantGuard

**Files:**
- Modify: `backend/src/common/guards/restaurant.guard.ts`

- [ ] **Step 1: Rewrite RestaurantGuard to read x-restaurant-id header and query restaurant_members**

Replace `backend/src/common/guards/restaurant.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass membership check but still need restaurant context
    if (user?.isSuperAdmin) {
      const restaurantId = request.headers['x-restaurant-id'];
      if (restaurantId) {
        const restaurant = await this.prisma.restaurant.findUnique({
          where: { id: restaurantId },
        });
        if (restaurant) {
          request.user = { ...user, restaurantId, restaurant };
        }
      }
      return true;
    }

    const restaurantId = request.headers['x-restaurant-id'];
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant selected');
    }

    const membership = await this.prisma.restaurantMember.findUnique({
      where: {
        userId_restaurantId: {
          userId: user.id,
          restaurantId,
        },
      },
      include: { restaurant: true },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('No access to this restaurant');
    }

    if (membership.restaurant.status !== 'APPROVED') {
      throw new ForbiddenException('Restaurant not approved yet');
    }

    // Attach restaurant context to request.user so @CurrentUser('restaurantId') keeps working
    request.user = {
      ...user,
      restaurantId,
      memberRole: membership.role,
      restaurant: membership.restaurant,
    };

    return true;
  }
}
```

Key: By setting `request.user.restaurantId`, all existing `@CurrentUser('restaurantId')` calls across every controller continue working unchanged.

- [ ] **Step 2: Commit**

```bash
git add backend/src/common/guards/restaurant.guard.ts
git commit -m "feat: RestaurantGuard reads x-restaurant-id header and queries memberships"
```

### Task 4: Update JwtAuthGuard with Auto-Provisioning

**Files:**
- Modify: `backend/src/common/guards/jwt-auth.guard.ts`

- [ ] **Step 1: Update JwtAuthGuard to remove restaurant include and add auto-provisioning**

Replace `backend/src/common/guards/jwt-auth.guard.ts`:

```typescript
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

    let user = await this.prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    // Auto-provisioning: create user record for Google OAuth first-time login
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email!.split('@')[0],
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
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

- [ ] **Step 2: Commit**

```bash
git add backend/src/common/guards/jwt-auth.guard.ts
git commit -m "feat: JwtAuthGuard auto-provisions users for Google OAuth"
```

### Task 5: Update Auth Service and DTOs

**Files:**
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/dto/register.dto.ts`

- [ ] **Step 1: Update RegisterDto to make restaurantName optional**

Replace `backend/src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

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
  @IsOptional()
  restaurantName?: string;
}
```

- [ ] **Step 2: Update AuthService register, login, getMe, and formatUserResponse**

Replace `backend/src/auth/auth.service.ts`:

```typescript
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

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseId: authData.user.id,
          email: dto.email,
          name: dto.name,
        },
      });

      let restaurant = null;
      if (dto.restaurantName) {
        const slug = this.generateSlug(dto.restaurantName);
        restaurant = await tx.restaurant.create({
          data: {
            name: dto.restaurantName,
            slug,
            status: 'PENDING',
          },
        });

        await tx.restaurantMember.create({
          data: {
            userId: user.id,
            restaurantId: restaurant.id,
            role: 'OWNER',
          },
        });
      }

      return { user, restaurant };
    });

    return {
      message: dto.restaurantName
        ? 'Registration successful. Your restaurant is pending approval.'
        : 'Registration successful.',
      userId: result.user.id,
      restaurantId: result.restaurant?.id || null,
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
      include: {
        memberships: {
          where: { isActive: true },
          include: { restaurant: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
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
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
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
      include: {
        memberships: {
          where: { isActive: true },
          include: { restaurant: true },
        },
      },
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
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
      memberships: (user.memberships || []).map((m: any) => ({
        restaurantId: m.restaurant.id,
        restaurantName: m.restaurant.name,
        restaurantSlug: m.restaurant.slug,
        restaurantStatus: m.restaurant.status,
        role: m.role,
      })),
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

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/
git commit -m "feat: update auth service for multi-restaurant memberships"
```

### Task 6: Update All Controllers' Role References

**Files:**
- Modify: All controllers that import `Role` from `@prisma/client`

- [ ] **Step 1: Find and replace Role imports across controllers**

In every controller that has `import { Role } from '@prisma/client'`, change to `import { MemberRole } from '@prisma/client'`.

In every controller that has `@Roles(Role.ADMIN)` or similar, change `Role.` to `MemberRole.`.

Files to update (search for `import { Role } from '@prisma/client'`):
- `backend/src/user/user.controller.ts`
- `backend/src/restaurant/restaurant.controller.ts`
- `backend/src/personnel/personnel.controller.ts`
- `backend/src/finance/expense.controller.ts`
- `backend/src/finance/expense-category.controller.ts`
- `backend/src/finance/revenue.controller.ts`
- `backend/src/inventory/raw-material.controller.ts`
- `backend/src/inventory/stock-movement.controller.ts`
- `backend/src/inventory/supplier.controller.ts`
- `backend/src/inventory/material-type.controller.ts`
- `backend/src/product/product.controller.ts`
- `backend/src/menu/menu.controller.ts`
- `backend/src/category/category.controller.ts`

For each file:
1. Replace `import { Role } from '@prisma/client'` with `import { MemberRole } from '@prisma/client'`
2. Replace all `Role.ADMIN` with `MemberRole.ADMIN`
3. Replace all `Role.STOCK_MANAGER` with `MemberRole.STOCK_MANAGER`
4. Replace all `Role.MENU_MANAGER` with `MemberRole.MENU_MANAGER`
5. Replace all `Role.ACCOUNTANT` with `MemberRole.ACCOUNTANT`
6. Replace all `Role.HR` with `MemberRole.HR`

- [ ] **Step 2: Verify backend compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/
git commit -m "refactor: replace Role enum with MemberRole across all controllers"
```

---

## Chunk 3: Backend Restaurant & Member Management

### Task 7: Add Restaurant Creation and Member Management Endpoints

**Files:**
- Modify: `backend/src/restaurant/restaurant.service.ts`
- Modify: `backend/src/restaurant/restaurant.controller.ts`
- Create: `backend/src/restaurant/dto/create-restaurant.dto.ts`
- Create: `backend/src/restaurant/dto/add-member.dto.ts`
- Create: `backend/src/restaurant/dto/update-member-role.dto.ts`
- Create: `backend/src/restaurant/dto/transfer-ownership.dto.ts`

- [ ] **Step 1: Create DTOs**

Create `backend/src/restaurant/dto/create-restaurant.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

Create `backend/src/restaurant/dto/add-member.dto.ts`:

```typescript
import { IsEmail, IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
```

Create `backend/src/restaurant/dto/update-member-role.dto.ts`:

```typescript
import { IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole)
  role: MemberRole;
}
```

Create `backend/src/restaurant/dto/transfer-ownership.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
```

- [ ] **Step 2: Update RestaurantService with new methods**

Replace `backend/src/restaurant/restaurant.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

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
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    const currentSettings = (restaurant?.settings as Record<string, any>) || {};
    const mergedSettings = { ...currentSettings, ...dto.settings };
    return this.prisma.restaurant.update({
      where: { id },
      data: { settings: mergedSettings },
    });
  }

  async create(userId: string, dto: CreateRestaurantDto) {
    const slug = this.generateSlug(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.name,
          slug,
          status: 'PENDING',
        },
      });

      await tx.restaurantMember.create({
        data: {
          userId,
          restaurantId: restaurant.id,
          role: 'OWNER',
        },
      });

      return restaurant;
    });
  }

  async getMyRestaurants(userId: string) {
    const memberships = await this.prisma.restaurantMember.findMany({
      where: { userId, isActive: true },
      include: { restaurant: true },
    });

    return memberships.map((m) => ({
      restaurantId: m.restaurant.id,
      restaurantName: m.restaurant.name,
      restaurantSlug: m.restaurant.slug,
      restaurantStatus: m.restaurant.status,
      role: m.role,
    }));
  }

  async getMembers(restaurantId: string) {
    const members = await this.prisma.restaurantMember.findMany({
      where: { restaurantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));
  }

  async addMember(restaurantId: string, dto: AddMemberDto) {
    if (dto.role === 'OWNER') {
      throw new BadRequestException('Cannot assign OWNER role directly. Use transfer-ownership.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!targetUser) {
      throw new BadRequestException('Bu kullanici sistemde bulunamadi.');
    }

    const existing = await this.prisma.restaurantMember.findUnique({
      where: {
        userId_restaurantId: {
          userId: targetUser.id,
          restaurantId,
        },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Bu kullanici zaten bu restoranda kayitli.');
      }
      // Re-activate deactivated member
      return this.prisma.restaurantMember.update({
        where: { id: existing.id },
        data: { isActive: true, role: dto.role },
      });
    }

    return this.prisma.restaurantMember.create({
      data: {
        userId: targetUser.id,
        restaurantId,
        role: dto.role,
      },
    });
  }

  async updateMemberRole(restaurantId: string, userId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot change OWNER role. Use transfer-ownership.');
    }

    if (dto.role === 'OWNER') {
      throw new BadRequestException('Cannot assign OWNER role directly. Use transfer-ownership.');
    }

    return this.prisma.restaurantMember.update({
      where: { id: membership.id },
      data: { role: dto.role },
    });
  }

  async deactivateMember(restaurantId: string, userId: string) {
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot deactivate OWNER. Transfer ownership first.');
    }

    return this.prisma.restaurantMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    });
  }

  async transferOwnership(restaurantId: string, currentUserId: string, dto: TransferOwnershipDto) {
    const currentMembership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId: currentUserId, restaurantId } },
    });

    if (!currentMembership || currentMembership.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    const targetMembership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId: dto.targetUserId, restaurantId } },
    });

    if (!targetMembership || !targetMembership.isActive) {
      throw new BadRequestException('Target user is not an active member of this restaurant');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.restaurantMember.update({
        where: { id: targetMembership.id },
        data: { role: 'OWNER' },
      });

      await tx.restaurantMember.update({
        where: { id: currentMembership.id },
        data: { role: 'ADMIN' },
      });

      return { message: 'Ownership transferred successfully' };
    });
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

- [ ] **Step 3: Update RestaurantController with new endpoints**

Replace `backend/src/restaurant/restaurant.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  // --- Non-restaurant-scoped routes (only JwtAuthGuard) ---

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRestaurantDto,
  ) {
    return this.restaurantService.create(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyRestaurants(@CurrentUser('id') userId: string) {
    return this.restaurantService.getMyRestaurants(userId);
  }

  // --- Restaurant-scoped routes (need x-restaurant-id header) ---

  @Get('current')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  getCurrent(@CurrentUser('restaurantId') restaurantId: string) {
    return this.restaurantService.findById(restaurantId);
  }

  @Patch('current')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  updateCurrent(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(restaurantId, dto);
  }

  @Patch('current/settings')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  updateSettings(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantSettingsDto,
  ) {
    return this.restaurantService.updateSettings(restaurantId, dto);
  }

  // --- Member management ---

  @Get('current/members')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  getMembers(@CurrentUser('restaurantId') restaurantId: string) {
    return this.restaurantService.getMembers(restaurantId);
  }

  @Post('current/members')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  addMember(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.restaurantService.addMember(restaurantId, dto);
  }

  @Patch('current/members/:userId/role')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  updateMemberRole(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.restaurantService.updateMemberRole(restaurantId, userId, dto);
  }

  @Delete('current/members/:userId')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  deactivateMember(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('userId') userId: string,
  ) {
    return this.restaurantService.deactivateMember(restaurantId, userId);
  }

  @Post('current/transfer-ownership')
  @UseGuards(JwtAuthGuard, RestaurantGuard)
  transferOwnership(
    @CurrentUser('restaurantId') restaurantId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.restaurantService.transferOwnership(restaurantId, currentUserId, dto);
  }
}
```

- [ ] **Step 4: Remove old UserModule endpoints (now handled by restaurant members)**

The old `/users` endpoints are replaced by `/restaurants/current/members`. Remove or gut the old UserController and UserService, and remove UserModule from AppModule imports.

Delete files:
- `backend/src/user/user.controller.ts`
- `backend/src/user/user.service.ts`
- `backend/src/user/user.module.ts`
- `backend/src/user/dto/create-user.dto.ts`
- `backend/src/user/dto/update-role.dto.ts`

In `backend/src/app.module.ts`, remove the `UserModule` import and its line in the `imports` array.

- [ ] **Step 5: Update frontend API paths for restaurant endpoint**

The old `GET /restaurant` endpoint is now `GET /restaurants/current`. Update the settings page API call:

In `frontend/src/app/dashboard/settings/page.tsx`, change:
- `api.get('/restaurant')` → `api.get('/restaurants/current')`
- `api.patch('/restaurant', ...)` → `api.patch('/restaurants/current', ...)`

- [ ] **Step 6: Verify backend compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/ frontend/src/app/dashboard/settings/
git commit -m "feat: add restaurant member management and ownership transfer endpoints"
```

---

## Chunk 4: Frontend Auth & Store

### Task 8: Update Zustand Auth Store

**Files:**
- Modify: `frontend/src/stores/auth-store.ts`

- [ ] **Step 1: Rewrite auth store with memberships and active restaurant**

Replace `frontend/src/stores/auth-store.ts`:

```typescript
import { create } from 'zustand';

interface Membership {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantStatus: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  memberships: Membership[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRestaurantId: string | null;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  switchRestaurant: (restaurantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeRestaurantId: typeof window !== 'undefined' ? localStorage.getItem('activeRestaurantId') : null,

  setUser: (user) => {
    const currentActive = get().activeRestaurantId;
    const approvedMemberships = user.memberships.filter((m) => m.restaurantStatus === 'APPROVED');

    // Keep current selection if still valid, otherwise pick first approved
    let activeId = currentActive;
    if (!activeId || !approvedMemberships.some((m) => m.restaurantId === activeId)) {
      activeId = approvedMemberships[0]?.restaurantId || null;
    }

    if (activeId && typeof window !== 'undefined') {
      localStorage.setItem('activeRestaurantId', activeId);
    }

    set({ user, isAuthenticated: true, isLoading: false, activeRestaurantId: activeId });
  },

  setLoading: (isLoading) => set({ isLoading }),

  switchRestaurant: (restaurantId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeRestaurantId', restaurantId);
    }
    set({ activeRestaurantId: restaurantId });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('activeRestaurantId');
    }
    set({ user: null, isAuthenticated: false, isLoading: false, activeRestaurantId: null });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/auth-store.ts
git commit -m "feat: auth store with memberships and active restaurant switching"
```

### Task 9: Update API Client with x-restaurant-id Header

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add x-restaurant-id to request interceptor**

Replace `frontend/src/lib/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const restaurantId = localStorage.getItem('activeRestaurantId');
    if (restaurantId) {
      config.headers['x-restaurant-id'] = restaurantId;
    }
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
          localStorage.removeItem('activeRestaurantId');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add x-restaurant-id header to API requests"
```

### Task 10: Update useAuth Hook

**Files:**
- Modify: `frontend/src/hooks/use-auth.ts`

- [ ] **Step 1: Update useAuth for new register flow (restaurantName optional)**

Replace `frontend/src/hooks/use-auth.ts`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import { useEffect } from 'react';

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, activeRestaurantId, setUser, setLoading, switchRestaurant, logout: clearAuth } = useAuthStore();

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
    restaurantName?: string;
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

  useEffect(() => {
    if (isLoading && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  // Derive active membership for convenience
  const activeMembership = user?.memberships.find((m) => m.restaurantId === activeRestaurantId) || null;

  return {
    user,
    isAuthenticated,
    isLoading,
    activeRestaurantId,
    activeMembership,
    login,
    register,
    logout,
    checkAuth,
    switchRestaurant,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-auth.ts
git commit -m "feat: useAuth hook with active membership and restaurant switching"
```

### Task 11: Update Login Page with Google OAuth

**Files:**
- Modify: `frontend/src/app/auth/login/page.tsx`

- [ ] **Step 1: Add Supabase client dependency**

Run:
```bash
cd frontend && npm install @supabase/supabase-js
```

- [ ] **Step 2: Create Supabase client utility**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Add Supabase env vars to frontend**

Add to `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://snkfphvatzljapsogtto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
```

Note: The anon key is found in Supabase Dashboard > Settings > API > anon public key. This is safe to expose in the frontend.

- [ ] **Step 4: Update Login page with Google button**

Replace `frontend/src/app/auth/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
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

  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
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
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">veya</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google ile Giris Yap
          </Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Hesabiniz yok mu?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              Kayit Ol
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Create OAuth callback page**

Create `frontend/src/app/auth/callback/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.push('/auth/login');
        return;
      }

      // Store tokens
      localStorage.setItem('accessToken', session.access_token);
      localStorage.setItem('refreshToken', session.refresh_token);

      // Fetch user data (JwtAuthGuard will auto-provision if needed)
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        router.push('/dashboard');
      } catch {
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Giris yapiliyor...</p>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: Google OAuth login with callback page and Supabase client"
```

### Task 12: Update Register Page

**Files:**
- Modify: `frontend/src/app/auth/register/page.tsx`

- [ ] **Step 1: Make restaurant name optional and add Google signup**

Replace `frontend/src/app/auth/register/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
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
      const payload: any = {
        email: form.email,
        password: form.password,
        name: form.name,
      };
      if (form.restaurantName.trim()) {
        payload.restaurantName = form.restaurantName.trim();
      }
      await register(payload);
      setSuccess(
        form.restaurantName.trim()
          ? 'Kayit basarili! Restoraniniz onay bekliyor.'
          : 'Kayit basarili! Giris yapabilirsiniz.',
      );
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayit basarisiz');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">HepYonet</CardTitle>
          <CardDescription>Yeni hesap olustur</CardDescription>
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
              <Label htmlFor="restaurantName">Restoran Adi <span className="text-muted-foreground font-normal">(opsiyonel)</span></Label>
              <Input id="restaurantName" name="restaurantName" value={form.restaurantName} onChange={handleChange} placeholder="Sonradan da olusturabilirsiniz" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Kayit yapiliyor...' : 'Kayit Ol'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">veya</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleRegister}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google ile Kayit Ol
          </Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Zaten hesabiniz var mi?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Giris Yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/auth/register/
git commit -m "feat: register page with optional restaurant and Google signup"
```

---

## Chunk 5: Frontend Dashboard & UI

### Task 13: Add Restaurant Switcher to Header

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`

- [ ] **Step 1: Add restaurant dropdown to header**

Replace `frontend/src/components/layout/header.tsx`:

```tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Menu, ChevronDown, Building2 } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, activeMembership, switchRestaurant, logout } = useAuth();
  const memberships = user?.memberships.filter((m) => m.restaurantStatus === 'APPROVED') || [];

  return (
    <header className="h-14 md:h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {memberships.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 outline-none">
              <Building2 className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{activeMembership?.restaurantName}</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.restaurantId}
                  onClick={() => switchRestaurant(m.restaurantId)}
                  className={m.restaurantId === activeMembership?.restaurantId ? 'bg-accent' : ''}
                >
                  {m.restaurantName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <h2 className="text-sm text-gray-500 truncate">{activeMembership?.restaurantName}</h2>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 md:px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer outline-none">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{user?.name}</span>
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/header.tsx
git commit -m "feat: restaurant switcher dropdown in header"
```

### Task 14: Update Dashboard Layout for No-Restaurant State

**Files:**
- Modify: `frontend/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Handle users with no restaurants**

Replace `frontend/src/app/dashboard/layout.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import messages from '../../../messages/tr.json';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, activeRestaurantId } = useAuthStore();
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // User has no approved restaurants
  const approvedMemberships = user?.memberships.filter((m) => m.restaurantStatus === 'APPROVED') || [];
  if (approvedMemberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Hosgeldiniz!</h1>
          <p className="text-gray-500">
            {user?.memberships.length
              ? 'Restoraniniz henuz onaylanmadi. Onay sonrasi erisim saglayabilirsiniz.'
              : 'Henuz bir restorana bagli degilsiniz. Bir restoran olusturun veya bir restoran yoneticisinden davet isteyin.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-3 md:p-6">
          <NextIntlClientProvider locale="tr" messages={messages}>
            {children}
          </NextIntlClientProvider>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/layout.tsx
git commit -m "feat: dashboard layout handles no-restaurant state"
```

### Task 15: Rewrite Users Page for Member Management

**Files:**
- Modify: `frontend/src/app/dashboard/users/page.tsx`

- [ ] **Step 1: Rewrite users page to use restaurant members endpoints**

Replace `frontend/src/app/dashboard/users/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

const ROLES = ['ADMIN', 'ACCOUNTANT', 'HR', 'STOCK_MANAGER', 'MENU_MANAGER', 'WAITER'] as const;
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yonetici',
  ACCOUNTANT: 'Muhasebe',
  HR: 'Insan Kaynaklari',
  STOCK_MANAGER: 'Depocu',
  MENU_MANAGER: 'Menu Yoneticisi',
  WAITER: 'Garson',
};

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function UsersPage() {
  const { user, activeMembership } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('ACCOUNTANT');

  const isOwner = activeMembership?.role === 'OWNER';

  const loadMembers = () => {
    api.get('/restaurants/current/members').then(({ data }) => {
      setMembers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, []);

  const handleAdd = async () => {
    if (!newEmail) {
      toast.error('E-posta adresini girin.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/restaurants/current/members', { email: newEmail, role: newRole });
      toast.success('Kullanici eklendi.');
      setDialogOpen(false);
      setNewEmail('');
      setNewRole('ACCOUNTANT');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanici eklenirken hata olustu.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/restaurants/current/members/${userId}/role`, { role });
      toast.success('Rol guncellendi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rol guncellenirken hata olustu.');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adli kullaniciyi cikarmak istediginize emin misiniz?`)) return;
    try {
      await api.delete(`/restaurants/current/members/${userId}`);
      toast.success('Kullanici cikarildi.');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanici cikarilirken hata olustu.');
    }
  };

  const handleTransferOwnership = async (userId: string, userName: string) => {
    if (!confirm(`Sahipligi ${userName} adli kullaniciya devretmek istediginize emin misiniz? Bu islem geri alinamaz.`)) return;
    try {
      await api.post('/restaurants/current/transfer-ownership', { targetUserId: userId });
      toast.success('Sahiplik devredildi.');
      // Refresh auth to get updated membership
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sahiplik devredilirken hata olustu.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kullanicilar</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Kullanici Ekle
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Islemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Henuz kullanici yok.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    {m.role === 'OWNER' || m.userId === user?.id ? (
                      <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    ) : (
                      <select
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? 'default' : 'secondary'}>
                      {m.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {m.role !== 'OWNER' && m.userId !== user?.id && m.isActive && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeactivate(m.userId, m.name)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {isOwner && m.role !== 'OWNER' && m.userId !== user?.id && m.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleTransferOwnership(m.userId, m.name)}
                        >
                          Sahiplik Devret
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanici Ekle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eklemek istediginiz kisinin sistemde kayitli e-posta adresini girin.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="kullanici@ornek.com" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Iptal</Button>
              <Button onClick={handleAdd} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Ekle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/users/
git commit -m "feat: users page with member management and ownership transfer"
```

### Task 16: Final Verification

- [ ] **Step 1: Start backend and check compilation**

Run:
```bash
cd backend && npm run start:dev
```

Expected: Server starts without errors.

- [ ] **Step 2: Start frontend and check compilation**

Run:
```bash
cd frontend && npm run dev
```

Expected: No build errors.

- [ ] **Step 3: Manual test checklist**

1. Register with email/password (without restaurant name) - should succeed
2. Register with email/password (with restaurant name) - should succeed
3. Login with email/password - should see memberships in response
4. Dashboard shows restaurant name in header
5. Users page shows members from `/restaurants/current/members`
6. Add member by email works (if target email exists)
7. Role change works (non-OWNER members)
8. Deactivate member works (non-OWNER)
9. Settings page loads from `/restaurants/current`

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete auth, ownership and multi-restaurant system"
```
