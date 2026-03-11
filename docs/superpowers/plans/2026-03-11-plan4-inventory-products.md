# Plan 4: Inventory + Product/Recipe Module

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the inventory management system (raw materials, stock movements, low stock alerts) and product/recipe system (product CRUD, ingredients with recursive cost calculation, composite products).

**Architecture:** Backend REST API modules (`InventoryModule`, `ProductModule`) consumed by Next.js frontend pages. Raw materials track stock levels and purchase prices. Products contain ingredients that reference raw materials or other sub-products. Cost calculation is recursive.

**Tech Stack:** NestJS, Next.js, Prisma, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, next-intl

**Spec:** `docs/superpowers/specs/2026-03-11-hepyonet-design.md`

**Prerequisites:** Plan 1 (Foundation) must be completed. Auth, guards, PrismaService, API client, dashboard layout, and i18n are all in place.

**Note on testing:** E2e and unit tests are deferred to a separate testing plan.

**Business Logic — Cost Calculation:**
- Raw material cost = quantity x lastPurchasePrice (converted to matching unit)
- Product cost = sum of all ingredient costs (raw material costs + sub-product costs recursively)
- Profit margin = (price - cost) / price
- Example: Kofte = 150g kiyma (320 TL/kg = 0.15 * 320 = 48 TL) + 5g baharat (200 TL/kg = 0.005 * 200 = 1 TL) = 49 TL

**Related Plans:**
- Plan 1: Foundation (prerequisite)
- Plan 2: Personnel (HR) Module
- Plan 3: Finance Module
- Plan 5: Menu + QR Menu Module (consumes Product data)
- Plan 6: Reporting Module

---

## File Structure

```
hepyonet/
├── backend/
│   └── src/
│       ├── inventory/
│       │   ├── inventory.module.ts
│       │   ├── raw-material.controller.ts
│       │   ├── raw-material.service.ts
│       │   ├── stock-movement.controller.ts
│       │   ├── stock-movement.service.ts
│       │   └── dto/
│       │       ├── create-raw-material.dto.ts
│       │       ├── update-raw-material.dto.ts
│       │       └── create-stock-movement.dto.ts
│       └── product/
│           ├── product.module.ts
│           ├── product.controller.ts
│           ├── product.service.ts
│           └── dto/
│               ├── create-product.dto.ts
│               ├── update-product.dto.ts
│               └── create-ingredient.dto.ts
├── frontend/
│   ├── messages/
│   │   └── tr.json  (modify — add inventory + product translations)
│   └── src/
│       └── app/
│           └── dashboard/
│               ├── inventory/
│               │   ├── page.tsx
│               │   └── movements/
│               │       └── page.tsx
│               └── products/
│                   ├── page.tsx
│                   ├── new/
│                   │   └── page.tsx
│                   └── [id]/
│                       └── page.tsx
```

---

## Chunk 1: Inventory Backend (Raw Materials + Stock Movements)

### Task 1: Create raw material DTOs

**Files:**
- Create: `backend/src/inventory/dto/create-raw-material.dto.ts`
- Create: `backend/src/inventory/dto/update-raw-material.dto.ts`
- Create: `backend/src/inventory/dto/create-stock-movement.dto.ts`

- [ ] **Step 1: Create CreateRawMaterialDto**

```typescript
// backend/src/inventory/dto/create-raw-material.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { MaterialUnit } from '@prisma/client';

export class CreateRawMaterialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MaterialUnit)
  unit: MaterialUnit;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentStock?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lastPurchasePrice?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockLevel?: number = 0;
}
```

- [ ] **Step 2: Create UpdateRawMaterialDto**

```typescript
// backend/src/inventory/dto/update-raw-material.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRawMaterialDto } from './create-raw-material.dto';

export class UpdateRawMaterialDto extends PartialType(CreateRawMaterialDto) {}
```

- [ ] **Step 3: Create CreateStockMovementDto**

```typescript
// backend/src/inventory/dto/create-stock-movement.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, IsUUID, Min } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class CreateStockMovementDto {
  @IsUUID()
  @IsNotEmpty()
  rawMaterialId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @IsDateString()
  date: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/inventory/dto/
git commit -m "feat(inventory): add DTOs for raw materials and stock movements"
```

---

### Task 2: Create RawMaterialService

**Files:**
- Create: `backend/src/inventory/raw-material.service.ts`

- [ ] **Step 1: Write RawMaterialService**

```typescript
// backend/src/inventory/raw-material.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';

@Injectable()
export class RawMaterialService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.rawMaterial.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id, restaurantId },
      include: {
        stockMovements: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }
    return material;
  }

  async create(restaurantId: string, dto: CreateRawMaterialDto) {
    return this.prisma.rawMaterial.create({
      data: {
        restaurantId,
        name: dto.name,
        unit: dto.unit,
        currentStock: dto.currentStock ?? 0,
        lastPurchasePrice: dto.lastPurchasePrice ?? 0,
        minStockLevel: dto.minStockLevel ?? 0,
      },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateRawMaterialDto) {
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }
    return this.prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
        ...(dto.lastPurchasePrice !== undefined && { lastPurchasePrice: dto.lastPurchasePrice }),
        ...(dto.minStockLevel !== undefined && { minStockLevel: dto.minStockLevel }),
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }
    return this.prisma.rawMaterial.delete({ where: { id } });
  }

  async findLowStock(restaurantId: string) {
    return this.prisma.rawMaterial.findMany({
      where: {
        restaurantId,
        currentStock: {
          lte: this.prisma.rawMaterial.fields.minStockLevel,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findLowStockRaw(restaurantId: string) {
    // Use raw query because Prisma does not support comparing two columns directly
    return this.prisma.$queryRaw`
      SELECT * FROM raw_materials
      WHERE "restaurantId" = ${restaurantId}
        AND "currentStock" <= "minStockLevel"
        AND "minStockLevel" > 0
      ORDER BY name ASC
    `;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/inventory/raw-material.service.ts
git commit -m "feat(inventory): add RawMaterialService with CRUD and low stock query"
```

---

### Task 3: Create RawMaterialController

**Files:**
- Create: `backend/src/inventory/raw-material.controller.ts`

- [ ] **Step 1: Write RawMaterialController**

```typescript
// backend/src/inventory/raw-material.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RawMaterialService } from './raw-material.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('raw-materials')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
export class RawMaterialController {
  constructor(private readonly rawMaterialService: RawMaterialService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.rawMaterialService.findAll(restaurantId);
  }

  @Get('low-stock')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findLowStock(@CurrentUser('restaurantId') restaurantId: string) {
    return this.rawMaterialService.findLowStockRaw(restaurantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findOne(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.rawMaterialService.findOne(id, restaurantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateRawMaterialDto,
  ) {
    return this.rawMaterialService.create(restaurantId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRawMaterialDto,
  ) {
    return this.rawMaterialService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.rawMaterialService.remove(id, restaurantId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/inventory/raw-material.controller.ts
git commit -m "feat(inventory): add RawMaterialController with role-guarded endpoints"
```

---

### Task 4: Create StockMovementService

**Files:**
- Create: `backend/src/inventory/stock-movement.service.ts`

- [ ] **Step 1: Write StockMovementService**

```typescript
// backend/src/inventory/stock-movement.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class StockMovementService {
  constructor(private prisma: PrismaService) {}

  async findByRawMaterial(rawMaterialId: string, restaurantId: string) {
    // Verify the raw material belongs to the restaurant
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id: rawMaterialId, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }

    return this.prisma.stockMovement.findMany({
      where: { rawMaterialId, restaurantId },
      orderBy: { date: 'desc' },
      include: {
        rawMaterial: {
          select: { name: true, unit: true },
        },
      },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.stockMovement.findMany({
      where: { restaurantId },
      orderBy: { date: 'desc' },
      include: {
        rawMaterial: {
          select: { id: true, name: true, unit: true },
        },
      },
    });
  }

  async create(restaurantId: string, dto: CreateStockMovementDto) {
    // Verify raw material exists and belongs to the restaurant
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id: dto.rawMaterialId, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }

    // For OUT movements, check sufficient stock
    if (dto.type === StockMovementType.OUT) {
      const currentStock = Number(material.currentStock);
      if (currentStock < dto.quantity) {
        throw new BadRequestException(
          `Yetersiz stok. Mevcut: ${currentStock}, Talep: ${dto.quantity}`,
        );
      }
    }

    // Use transaction: create movement + update stock + update lastPurchasePrice
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          restaurantId,
          rawMaterialId: dto.rawMaterialId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          type: dto.type,
          supplier: dto.supplier,
          invoiceNo: dto.invoiceNo,
          date: new Date(dto.date),
        },
        include: {
          rawMaterial: {
            select: { id: true, name: true, unit: true },
          },
        },
      });

      // Calculate new stock level
      const currentStock = Number(material.currentStock);
      const newStock =
        dto.type === StockMovementType.IN
          ? currentStock + dto.quantity
          : currentStock - dto.quantity;

      // Build update data
      const updateData: Record<string, unknown> = {
        currentStock: newStock,
      };

      // Update lastPurchasePrice on IN movements
      if (dto.type === StockMovementType.IN && dto.unitPrice > 0) {
        updateData.lastPurchasePrice = dto.unitPrice;
      }

      await tx.rawMaterial.update({
        where: { id: dto.rawMaterialId },
        data: updateData,
      });

      return movement;
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/inventory/stock-movement.service.ts
git commit -m "feat(inventory): add StockMovementService with transactional stock updates"
```

---

### Task 5: Create StockMovementController

**Files:**
- Create: `backend/src/inventory/stock-movement.controller.ts`

- [ ] **Step 1: Write StockMovementController**

```typescript
// backend/src/inventory/stock-movement.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StockMovementService } from './stock-movement.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.stockMovementService.findAll(restaurantId);
  }

  @Get('by-material/:rawMaterialId')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findByRawMaterial(
    @Param('rawMaterialId') rawMaterialId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.stockMovementService.findByRawMaterial(rawMaterialId, restaurantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.stockMovementService.create(restaurantId, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/inventory/stock-movement.controller.ts
git commit -m "feat(inventory): add StockMovementController with role-guarded endpoints"
```

---

### Task 6: Create InventoryModule and register in AppModule

**Files:**
- Create: `backend/src/inventory/inventory.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write InventoryModule**

```typescript
// backend/src/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { RawMaterialController } from './raw-material.controller';
import { RawMaterialService } from './raw-material.service';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';

@Module({
  controllers: [RawMaterialController, StockMovementController],
  providers: [RawMaterialService, StockMovementService],
  exports: [RawMaterialService],
})
export class InventoryModule {}
```

- [ ] **Step 2: Register InventoryModule in AppModule**

Add the import to `backend/src/app.module.ts`:

```typescript
// backend/src/app.module.ts
// Add to imports array:
import { InventoryModule } from './inventory/inventory.module';

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
    // ... any other existing modules ...
    InventoryModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/inventory/inventory.module.ts backend/src/app.module.ts
git commit -m "feat(inventory): add InventoryModule and register in AppModule"
```

---

## Chunk 2: Product/Recipe Backend

### Task 7: Create product DTOs

**Files:**
- Create: `backend/src/product/dto/create-product.dto.ts`
- Create: `backend/src/product/dto/update-product.dto.ts`
- Create: `backend/src/product/dto/create-ingredient.dto.ts`

- [ ] **Step 1: Create CreateProductDto**

```typescript
// backend/src/product/dto/create-product.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number = 0;

  @IsBoolean()
  @IsOptional()
  isMenuItem?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isComposite?: boolean = false;

  @IsString()
  @IsOptional()
  category?: string;
}
```

- [ ] **Step 2: Create UpdateProductDto**

```typescript
// backend/src/product/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

- [ ] **Step 3: Create CreateIngredientDto**

```typescript
// backend/src/product/dto/create-ingredient.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, Min, ValidateIf } from 'class-validator';

export class CreateIngredientDto {
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.subProductId)
  rawMaterialId?: string;

  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.rawMaterialId)
  subProductId?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/product/dto/
git commit -m "feat(product): add DTOs for products and ingredients"
```

---

### Task 8: Create ProductService with recursive cost calculation

**Files:**
- Create: `backend/src/product/product.service.ts`

- [ ] **Step 1: Write ProductService**

```typescript
// backend/src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    const products = await this.prisma.product.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: {
        ingredients: {
          include: {
            rawMaterial: { select: { id: true, name: true, unit: true, lastPurchasePrice: true } },
            subProduct: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Attach computed cost to each product
    const productsWithCost = await Promise.all(
      products.map(async (product) => {
        const cost = await this.calculateCost(product.id, restaurantId);
        const price = Number(product.price);
        const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
        return {
          ...product,
          calculatedCost: cost,
          profitMargin: Math.round(profitMargin * 100) / 100,
        };
      }),
    );

    return productsWithCost;
  }

  async findOne(id: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: {
        ingredients: {
          include: {
            rawMaterial: {
              select: {
                id: true,
                name: true,
                unit: true,
                lastPurchasePrice: true,
                currentStock: true,
              },
            },
            subProduct: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const cost = await this.calculateCost(id, restaurantId);
    const price = Number(product.price);
    const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;

    return {
      ...product,
      calculatedCost: cost,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }

  async create(restaurantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        restaurantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        image: dto.image,
        price: dto.price ?? 0,
        isMenuItem: dto.isMenuItem ?? false,
        isComposite: dto.isComposite ?? false,
        category: dto.category,
      },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.isMenuItem !== undefined && { isMenuItem: dto.isMenuItem }),
        ...(dto.isComposite !== undefined && { isComposite: dto.isComposite }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    // Delete associated ingredients first, then the product
    await this.prisma.productIngredient.deleteMany({
      where: { productId: id },
    });

    return this.prisma.product.delete({ where: { id } });
  }

  // --- Ingredient management ---

  async addIngredient(productId: string, restaurantId: string, dto: CreateIngredientDto) {
    // Validate the product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    // Must specify exactly one of rawMaterialId or subProductId
    if (!dto.rawMaterialId && !dto.subProductId) {
      throw new BadRequestException('rawMaterialId veya subProductId belirtilmelidir');
    }
    if (dto.rawMaterialId && dto.subProductId) {
      throw new BadRequestException('Ayni anda hem rawMaterialId hem subProductId belirtilemez');
    }

    // Validate referenced entity exists and belongs to the restaurant
    if (dto.rawMaterialId) {
      const material = await this.prisma.rawMaterial.findFirst({
        where: { id: dto.rawMaterialId, restaurantId },
      });
      if (!material) {
        throw new NotFoundException('Ham madde bulunamadi');
      }
    }

    if (dto.subProductId) {
      // Prevent self-reference
      if (dto.subProductId === productId) {
        throw new BadRequestException('Urun kendisini icerik olarak iceremez');
      }

      const subProduct = await this.prisma.product.findFirst({
        where: { id: dto.subProductId, restaurantId },
      });
      if (!subProduct) {
        throw new NotFoundException('Alt urun bulunamadi');
      }

      // Check for circular dependency
      const hasCircular = await this.checkCircularDependency(
        dto.subProductId,
        productId,
        restaurantId,
      );
      if (hasCircular) {
        throw new BadRequestException('Dongusel bagimlilk tespit edildi. Bu alt urun eklenemez.');
      }
    }

    return this.prisma.productIngredient.create({
      data: {
        productId,
        rawMaterialId: dto.rawMaterialId || null,
        subProductId: dto.subProductId || null,
        quantity: dto.quantity,
        unit: dto.unit,
      },
      include: {
        rawMaterial: { select: { id: true, name: true, unit: true, lastPurchasePrice: true } },
        subProduct: { select: { id: true, name: true } },
      },
    });
  }

  async updateIngredient(
    productId: string,
    ingredientId: string,
    restaurantId: string,
    dto: Partial<CreateIngredientDto>,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const ingredient = await this.prisma.productIngredient.findFirst({
      where: { id: ingredientId, productId },
    });
    if (!ingredient) {
      throw new NotFoundException('Icerik bulunamadi');
    }

    return this.prisma.productIngredient.update({
      where: { id: ingredientId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
      },
      include: {
        rawMaterial: { select: { id: true, name: true, unit: true, lastPurchasePrice: true } },
        subProduct: { select: { id: true, name: true } },
      },
    });
  }

  async removeIngredient(productId: string, ingredientId: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const ingredient = await this.prisma.productIngredient.findFirst({
      where: { id: ingredientId, productId },
    });
    if (!ingredient) {
      throw new NotFoundException('Icerik bulunamadi');
    }

    return this.prisma.productIngredient.delete({ where: { id: ingredientId } });
  }

  // --- Cost calculation ---

  async calculateCost(
    productId: string,
    restaurantId: string,
    visited: Set<string> = new Set(),
  ): Promise<number> {
    // Guard against circular references
    if (visited.has(productId)) {
      return 0;
    }
    visited.add(productId);

    const ingredients = await this.prisma.productIngredient.findMany({
      where: { productId },
      include: {
        rawMaterial: {
          select: { lastPurchasePrice: true, unit: true },
        },
      },
    });

    let totalCost = 0;

    for (const ingredient of ingredients) {
      const quantity = Number(ingredient.quantity);

      if (ingredient.rawMaterialId && ingredient.rawMaterial) {
        // Raw material cost: quantity * lastPurchasePrice
        // Convert units: ingredient quantity is in the unit specified on the ingredient row
        // lastPurchasePrice is per base unit (KG, LT, ADET)
        const pricePerBaseUnit = Number(ingredient.rawMaterial.lastPurchasePrice);
        const ingredientUnit = ingredient.unit.toUpperCase();
        const materialBaseUnit = ingredient.rawMaterial.unit;

        const convertedQuantity = this.convertToBaseUnit(
          quantity,
          ingredientUnit,
          materialBaseUnit,
        );
        totalCost += convertedQuantity * pricePerBaseUnit;
      } else if (ingredient.subProductId) {
        // Sub-product cost: recursively calculate
        const subCost = await this.calculateCost(
          ingredient.subProductId,
          restaurantId,
          new Set(visited),
        );
        totalCost += subCost * quantity;
      }
    }

    return Math.round(totalCost * 100) / 100;
  }

  async getCostBreakdown(productId: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      include: {
        ingredients: {
          include: {
            rawMaterial: {
              select: { id: true, name: true, unit: true, lastPurchasePrice: true },
            },
            subProduct: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const breakdown = await Promise.all(
      product.ingredients.map(async (ingredient) => {
        const quantity = Number(ingredient.quantity);

        if (ingredient.rawMaterialId && ingredient.rawMaterial) {
          const pricePerBaseUnit = Number(ingredient.rawMaterial.lastPurchasePrice);
          const convertedQuantity = this.convertToBaseUnit(
            quantity,
            ingredient.unit.toUpperCase(),
            ingredient.rawMaterial.unit,
          );
          const cost = Math.round(convertedQuantity * pricePerBaseUnit * 100) / 100;

          return {
            type: 'raw_material' as const,
            id: ingredient.rawMaterial.id,
            name: ingredient.rawMaterial.name,
            quantity,
            unit: ingredient.unit,
            unitPrice: pricePerBaseUnit,
            baseUnit: ingredient.rawMaterial.unit,
            cost,
          };
        } else if (ingredient.subProductId && ingredient.subProduct) {
          const subCost = await this.calculateCost(
            ingredient.subProductId,
            restaurantId,
          );
          const cost = Math.round(subCost * quantity * 100) / 100;

          return {
            type: 'sub_product' as const,
            id: ingredient.subProduct.id,
            name: ingredient.subProduct.name,
            quantity,
            unit: ingredient.unit,
            unitCost: subCost,
            cost,
          };
        }

        return null;
      }),
    );

    const totalCost = breakdown.reduce((sum, item) => sum + (item?.cost ?? 0), 0);
    const price = Number(product.price);
    const profitMargin = price > 0 ? ((price - totalCost) / price) * 100 : 0;

    return {
      productId: product.id,
      productName: product.name,
      price,
      totalCost: Math.round(totalCost * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      ingredients: breakdown.filter(Boolean),
    };
  }

  // --- Private helpers ---

  /**
   * Convert a quantity from one unit to the base unit for price calculation.
   * lastPurchasePrice is stored per base unit (KG, LT, ADET).
   * GR -> KG: divide by 1000
   * ML -> LT: divide by 1000
   * Same unit: no conversion
   */
  private convertToBaseUnit(
    quantity: number,
    ingredientUnit: string,
    materialBaseUnit: string,
  ): number {
    const from = ingredientUnit.toUpperCase();
    const to = materialBaseUnit.toUpperCase();

    if (from === to) return quantity;

    // GR to KG
    if (from === 'GR' && to === 'KG') return quantity / 1000;
    // KG to GR
    if (from === 'KG' && to === 'GR') return quantity * 1000;
    // ML to LT
    if (from === 'ML' && to === 'LT') return quantity / 1000;
    // LT to ML
    if (from === 'LT' && to === 'ML') return quantity * 1000;

    // No known conversion — assume same unit
    return quantity;
  }

  /**
   * Check for circular dependency: does `subProductId` eventually reference `targetProductId`?
   */
  private async checkCircularDependency(
    subProductId: string,
    targetProductId: string,
    restaurantId: string,
    visited: Set<string> = new Set(),
  ): Promise<boolean> {
    if (visited.has(subProductId)) return false;
    visited.add(subProductId);

    const ingredients = await this.prisma.productIngredient.findMany({
      where: { productId: subProductId },
      select: { subProductId: true },
    });

    for (const ing of ingredients) {
      if (!ing.subProductId) continue;
      if (ing.subProductId === targetProductId) return true;
      const found = await this.checkCircularDependency(
        ing.subProductId,
        targetProductId,
        restaurantId,
        visited,
      );
      if (found) return true;
    }

    return false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/product/product.service.ts
git commit -m "feat(product): add ProductService with recursive cost calculation and ingredient management"
```

---

### Task 9: Create ProductController

**Files:**
- Create: `backend/src/product/product.controller.ts`

- [ ] **Step 1: Write ProductController**

```typescript
// backend/src/product/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.productService.findAll(restaurantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  findOne(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.findOne(id, restaurantId);
  }

  @Get(':id/cost')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  getCostBreakdown(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.getCostBreakdown(id, restaurantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(restaurantId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.remove(id, restaurantId);
  }

  // --- Ingredient endpoints ---

  @Post(':id/ingredients')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  addIngredient(
    @Param('id') productId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateIngredientDto,
  ) {
    return this.productService.addIngredient(productId, restaurantId, dto);
  }

  @Patch(':id/ingredients/:ingredientId')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  updateIngredient(
    @Param('id') productId: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: Partial<CreateIngredientDto>,
  ) {
    return this.productService.updateIngredient(
      productId,
      ingredientId,
      restaurantId,
      dto,
    );
  }

  @Delete(':id/ingredients/:ingredientId')
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  removeIngredient(
    @Param('id') productId: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.removeIngredient(productId, ingredientId, restaurantId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/product/product.controller.ts
git commit -m "feat(product): add ProductController with CRUD, ingredient, and cost endpoints"
```

---

### Task 10: Create ProductModule and register in AppModule

**Files:**
- Create: `backend/src/product/product.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write ProductModule**

```typescript
// backend/src/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

- [ ] **Step 2: Register ProductModule in AppModule**

Add the import to `backend/src/app.module.ts`:

```typescript
// backend/src/app.module.ts
// Add to imports array:
import { ProductModule } from './product/product.module';

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
    InventoryModule,
    ProductModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/product/product.module.ts backend/src/app.module.ts
git commit -m "feat(product): add ProductModule and register in AppModule"
```

---

## Chunk 3: Frontend — i18n + Inventory Pages

### Task 11: Add inventory and product translations

**Files:**
- Modify: `frontend/messages/tr.json`

- [ ] **Step 1: Add translations to tr.json**

Add the following keys to the existing `tr.json` file:

```json
{
  "inventory": {
    "title": "Stok Yonetimi",
    "rawMaterials": "Ham Maddeler",
    "addMaterial": "Ham Madde Ekle",
    "editMaterial": "Ham Madde Duzenle",
    "name": "Adi",
    "unit": "Birim",
    "currentStock": "Mevcut Stok",
    "lastPurchasePrice": "Son Alis Fiyati",
    "minStockLevel": "Minimum Stok",
    "lowStock": "Dusuk Stok",
    "lowStockAlert": "Dusuk Stok Uyarisi",
    "stockStatus": "Stok Durumu",
    "normal": "Normal",
    "critical": "Kritik",
    "movements": "Stok Hareketleri",
    "addMovement": "Hareket Ekle",
    "movementType": "Hareket Tipi",
    "in": "Giris",
    "out": "Cikis",
    "quantity": "Miktar",
    "unitPrice": "Birim Fiyat",
    "supplier": "Tedarikci",
    "invoiceNo": "Fatura No",
    "date": "Tarih",
    "totalValue": "Toplam Deger",
    "insufficientStock": "Yetersiz stok",
    "materialNotFound": "Ham madde bulunamadi",
    "units": {
      "KG": "Kilogram",
      "GR": "Gram",
      "LT": "Litre",
      "ML": "Mililitre",
      "ADET": "Adet"
    }
  },
  "product": {
    "title": "Urunler",
    "addProduct": "Urun Ekle",
    "editProduct": "Urun Duzenle",
    "productDetail": "Urun Detayi",
    "name": "Urun Adi",
    "code": "Urun Kodu",
    "description": "Aciklama",
    "image": "Gorsel",
    "price": "Satis Fiyati",
    "category": "Kategori",
    "isMenuItem": "Menu Urunu",
    "isComposite": "Kompozit Urun",
    "cost": "Maliyet",
    "profitMargin": "Kar Marji",
    "ingredients": "Icerikler / Recete",
    "addIngredient": "Icerik Ekle",
    "rawMaterial": "Ham Madde",
    "subProduct": "Alt Urun",
    "quantity": "Miktar",
    "unit": "Birim",
    "unitCost": "Birim Maliyet",
    "ingredientCost": "Icerik Maliyeti",
    "totalCost": "Toplam Maliyet",
    "costBreakdown": "Maliyet Dokumu",
    "noIngredients": "Henuz icerik eklenmedi",
    "circularError": "Dongusel bagimlilk tespit edildi",
    "selectType": "Icerik Tipi Secin",
    "selectMaterial": "Ham Madde Secin",
    "selectProduct": "Alt Urun Secin"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/tr.json
git commit -m "feat(i18n): add Turkish translations for inventory and product modules"
```

---

### Task 12: Create inventory page (raw materials list)

**Files:**
- Create: `frontend/src/app/dashboard/inventory/page.tsx`

- [ ] **Step 1: Write inventory page**

```tsx
// frontend/src/app/dashboard/inventory/page.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  lastPurchasePrice: number;
  minStockLevel: number;
}

const UNITS = ['KG', 'GR', 'LT', 'ML', 'ADET'] as const;

export default function InventoryPage() {
  const t = useTranslations('inventory');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [form, setForm] = useState({
    name: '',
    unit: 'KG' as string,
    currentStock: 0,
    lastPurchasePrice: 0,
    minStockLevel: 0,
  });

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const { data: lowStockMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials', 'low-stock'],
    queryFn: () => api.get('/raw-materials/low-stock').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/raw-materials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      api.patch(`/raw-materials/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/raw-materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      toast.success(tc('delete') + ' - OK');
    },
  });

  function resetForm() {
    setForm({ name: '', unit: 'KG', currentStock: 0, lastPurchasePrice: 0, minStockLevel: 0 });
    setEditingMaterial(null);
    setDialogOpen(false);
  }

  function openEdit(material: RawMaterial) {
    setEditingMaterial(material);
    setForm({
      name: material.name,
      unit: material.unit,
      currentStock: Number(material.currentStock),
      lastPurchasePrice: Number(material.lastPurchasePrice),
      minStockLevel: Number(material.minStockLevel),
    });
    setDialogOpen(true);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function isLowStock(material: RawMaterial) {
    return Number(material.minStockLevel) > 0 && Number(material.currentStock) <= Number(material.minStockLevel);
  }

  if (isLoading) {
    return <div className="p-6">{tc('loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addMaterial')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? t('editMaterial') : t('addMaterial')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t('unit')}</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`units.${u}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('currentStock')}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>{t('minStockLevel')}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('lastPurchasePrice')} (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.lastPurchasePrice}
                  onChange={(e) => setForm({ ...form, lastPurchasePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {tc('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low stock alert */}
      {lowStockMaterials.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              {t('lowStockAlert')} ({lowStockMaterials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockMaterials.map((m: RawMaterial) => (
                <Badge key={m.id} variant="destructive">
                  {m.name}: {Number(m.currentStock)} {m.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rawMaterials')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('unit')}</TableHead>
                <TableHead className="text-right">{t('currentStock')}</TableHead>
                <TableHead className="text-right">{t('minStockLevel')}</TableHead>
                <TableHead className="text-right">{t('lastPurchasePrice')}</TableHead>
                <TableHead className="text-center">{t('stockStatus')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>{t(`units.${material.unit}`)}</TableCell>
                  <TableCell className="text-right">{Number(material.currentStock).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(material.minStockLevel).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(material.lastPurchasePrice).toFixed(2)} TL</TableCell>
                  <TableCell className="text-center">
                    {isLowStock(material) ? (
                      <Badge variant="destructive">{t('critical')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('normal')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(material)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(tc('confirm') + '?')) {
                            deleteMutation.mutate(material.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {materials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('materialNotFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/inventory/page.tsx
git commit -m "feat(frontend): add inventory page with raw materials CRUD and low stock alerts"
```

---

### Task 13: Create stock movements page

**Files:**
- Create: `frontend/src/app/dashboard/inventory/movements/page.tsx`

- [ ] **Step 1: Write stock movements page**

```tsx
// frontend/src/app/dashboard/inventory/movements/page.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface StockMovement {
  id: string;
  rawMaterialId: string;
  quantity: number;
  unitPrice: number;
  type: 'IN' | 'OUT';
  supplier: string | null;
  invoiceNo: string | null;
  date: string;
  createdAt: string;
  rawMaterial: {
    id: string;
    name: string;
    unit: string;
  };
}

export default function StockMovementsPage() {
  const t = useTranslations('inventory');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    rawMaterialId: '',
    quantity: 0,
    unitPrice: 0,
    type: 'IN' as 'IN' | 'OUT',
    supplier: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ['stock-movements'],
    queryFn: () => api.get('/stock-movements').then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/stock-movements', {
        ...data,
        supplier: data.supplier || undefined,
        invoiceNo: data.invoiceNo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      resetForm();
      toast.success(tc('save') + ' - OK');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Hata olustu';
      toast.error(message);
    },
  });

  function resetForm() {
    setForm({
      rawMaterialId: '',
      quantity: 0,
      unitPrice: 0,
      type: 'IN',
      supplier: '',
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
    });
    setDialogOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  if (isLoading) {
    return <div className="p-6">{tc('loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('movements')}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addMovement')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addMovement')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('rawMaterials')}</Label>
                <Select
                  value={form.rawMaterialId}
                  onValueChange={(v) => setForm({ ...form, rawMaterialId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('rawMaterials')} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('movementType')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as 'IN' | 'OUT' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">{t('in')}</SelectItem>
                    <SelectItem value="OUT">{t('out')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('quantity')}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>{t('unitPrice')} (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>{t('supplier')}</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('invoiceNo')}</Label>
                <Input
                  value={form.invoiceNo}
                  onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('date')}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {tc('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('movements')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="text-center">{t('movementType')}</TableHead>
                <TableHead className="text-right">{t('quantity')}</TableHead>
                <TableHead className="text-right">{t('unitPrice')}</TableHead>
                <TableHead className="text-right">{t('totalValue')}</TableHead>
                <TableHead>{t('supplier')}</TableHead>
                <TableHead>{t('invoiceNo')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {new Date(movement.date).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {movement.rawMaterial.name}
                  </TableCell>
                  <TableCell className="text-center">
                    {movement.type === 'IN' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <ArrowDownCircle className="mr-1 h-3 w-3" />
                        {t('in')}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <ArrowUpCircle className="mr-1 h-3 w-3" />
                        {t('out')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.quantity).toFixed(2)} {movement.rawMaterial.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.unitPrice).toFixed(2)} TL
                  </TableCell>
                  <TableCell className="text-right">
                    {(Number(movement.quantity) * Number(movement.unitPrice)).toFixed(2)} TL
                  </TableCell>
                  <TableCell>{movement.supplier || '-'}</TableCell>
                  <TableCell>{movement.invoiceNo || '-'}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Henuz stok hareketi bulunmuyor
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/inventory/movements/page.tsx
git commit -m "feat(frontend): add stock movements page with IN/OUT tracking"
```

---

## Chunk 4: Frontend — Product Pages

### Task 14: Create products list page

**Files:**
- Create: `frontend/src/app/dashboard/products/page.tsx`

- [ ] **Step 1: Write products list page**

```tsx
// frontend/src/app/dashboard/products/page.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  price: number;
  isMenuItem: boolean;
  isComposite: boolean;
  category: string | null;
  calculatedCost: number;
  profitMargin: number;
  ingredients: unknown[];
}

export default function ProductsPage() {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(tc('delete') + ' - OK');
    },
  });

  if (isLoading) {
    return <div className="p-6">{tc('loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push('/dashboard/products/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addProduct')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('code')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('category')}</TableHead>
                <TableHead className="text-right">{t('price')} (TL)</TableHead>
                <TableHead className="text-right">{t('cost')} (TL)</TableHead>
                <TableHead className="text-right">{t('profitMargin')}</TableHead>
                <TableHead className="text-center">{t('isMenuItem')}</TableHead>
                <TableHead className="text-center">{t('isComposite')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.code || '-'}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell className="text-right">
                    {Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.calculatedCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.profitMargin > 50
                          ? 'text-green-600 font-medium'
                          : product.profitMargin > 20
                            ? 'text-yellow-600 font-medium'
                            : 'text-red-600 font-medium'
                      }
                    >
                      %{product.profitMargin.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {product.isMenuItem ? (
                      <Badge variant="default">Menu</Badge>
                    ) : (
                      <Badge variant="secondary">-</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.isComposite ? (
                      <Badge variant="outline">Kompozit</Badge>
                    ) : (
                      <Badge variant="secondary">-</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(tc('confirm') + '?')) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Henuz urun eklenmedi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/products/page.tsx
git commit -m "feat(frontend): add products list page with cost and profit margin display"
```

---

### Task 15: Create new product page

**Files:**
- Create: `frontend/src/app/dashboard/products/new/page.tsx`

- [ ] **Step 1: Write new product page**

```tsx
// frontend/src/app/dashboard/products/new/page.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProductPage() {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    image: '',
    price: 0,
    isMenuItem: false,
    isComposite: false,
    category: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/products', {
        ...data,
        code: data.code || undefined,
        description: data.description || undefined,
        image: data.image || undefined,
        category: data.category || undefined,
      }),
    onSuccess: (response) => {
      toast.success(tc('save') + ' - OK');
      router.push(`/dashboard/products/${response.data.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('addProduct')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('addProduct')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('name')} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t('code')}</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="URN-001"
                />
              </div>
            </div>

            <div>
              <Label>{t('description')}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('price')} (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t('category')}</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ana Yemek, Tatli, Icecek..."
                />
              </div>
            </div>

            <div>
              <Label>{t('image')} (URL)</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isMenuItem"
                  checked={form.isMenuItem}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isMenuItem: checked === true })
                  }
                />
                <Label htmlFor="isMenuItem">{t('isMenuItem')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isComposite"
                  checked={form.isComposite}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isComposite: checked === true })
                  }
                />
                <Label htmlFor="isComposite">{t('isComposite')}</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {tc('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/products/new/page.tsx
git commit -m "feat(frontend): add new product creation page"
```

---

### Task 16: Create product detail page with recipe/ingredients

**Files:**
- Create: `frontend/src/app/dashboard/products/[id]/page.tsx`

- [ ] **Step 1: Write product detail page**

```tsx
// frontend/src/app/dashboard/products/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  lastPurchasePrice: number;
  currentStock?: number;
}

interface SubProduct {
  id: string;
  name: string;
  price?: number;
}

interface Ingredient {
  id: string;
  productId: string;
  rawMaterialId: string | null;
  subProductId: string | null;
  quantity: number;
  unit: string;
  rawMaterial: RawMaterial | null;
  subProduct: SubProduct | null;
}

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image: string | null;
  price: number;
  isMenuItem: boolean;
  isComposite: boolean;
  category: string | null;
  calculatedCost: number;
  profitMargin: number;
  ingredients: Ingredient[];
}

interface CostBreakdownItem {
  type: 'raw_material' | 'sub_product';
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  baseUnit?: string;
  unitCost?: number;
  cost: number;
}

interface CostBreakdown {
  productId: string;
  productName: string;
  price: number;
  totalCost: number;
  profitMargin: number;
  ingredients: CostBreakdownItem[];
}

const UNITS = ['KG', 'GR', 'LT', 'ML', 'ADET'] as const;

export default function ProductDetailPage() {
  const t = useTranslations('product');
  const ti = useTranslations('inventory');
  const tc = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;

  const [editMode, setEditMode] = useState(false);
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [ingredientType, setIngredientType] = useState<'raw_material' | 'sub_product'>('raw_material');
  const [ingredientForm, setIngredientForm] = useState({
    rawMaterialId: '',
    subProductId: '',
    quantity: 0,
    unit: 'GR',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    description: '',
    image: '',
    price: 0,
    isMenuItem: false,
    isComposite: false,
    category: '',
  });

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['products', productId],
    queryFn: () => api.get(`/products/${productId}`).then((r) => r.data),
  });

  const { data: costBreakdown } = useQuery<CostBreakdown>({
    queryKey: ['products', productId, 'cost'],
    queryFn: () => api.get(`/products/${productId}/cost`).then((r) => r.data),
  });

  const { data: allMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof editForm) =>
      api.patch(`/products/${productId}`, {
        ...data,
        code: data.code || undefined,
        description: data.description || undefined,
        image: data.image || undefined,
        category: data.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditMode(false);
      toast.success(tc('save') + ' - OK');
    },
  });

  const addIngredientMutation = useMutation({
    mutationFn: (data: {
      rawMaterialId?: string;
      subProductId?: string;
      quantity: number;
      unit: string;
    }) => api.post(`/products/${productId}/ingredients`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetIngredientForm();
      toast.success(tc('save') + ' - OK');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Hata olustu';
      toast.error(message);
    },
  });

  const removeIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) =>
      api.delete(`/products/${productId}/ingredients/${ingredientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(tc('delete') + ' - OK');
    },
  });

  function startEdit() {
    if (!product) return;
    setEditForm({
      name: product.name,
      code: product.code || '',
      description: product.description || '',
      image: product.image || '',
      price: Number(product.price),
      isMenuItem: product.isMenuItem,
      isComposite: product.isComposite,
      category: product.category || '',
    });
    setEditMode(true);
  }

  function resetIngredientForm() {
    setIngredientForm({ rawMaterialId: '', subProductId: '', quantity: 0, unit: 'GR' });
    setIngredientType('raw_material');
    setIngredientDialogOpen(false);
  }

  function handleIngredientSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: {
      rawMaterialId?: string;
      subProductId?: string;
      quantity: number;
      unit: string;
    } = {
      quantity: ingredientForm.quantity,
      unit: ingredientForm.unit,
    };
    if (ingredientType === 'raw_material') {
      data.rawMaterialId = ingredientForm.rawMaterialId;
    } else {
      data.subProductId = ingredientForm.subProductId;
    }
    addIngredientMutation.mutate(data);
  }

  if (isLoading || !product) {
    return <div className="p-6">{tc('loading')}</div>;
  }

  // Filter out current product from sub-product options
  const availableSubProducts = allProducts.filter((p) => p.id !== productId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {!editMode && (
          <Button variant="outline" onClick={startEdit}>
            {tc('edit')}
          </Button>
        )}
      </div>

      {/* Product Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('productDetail')}</CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editForm);
              }}
              className="space-y-4 max-w-2xl"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('name')} *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>{t('code')}</Label>
                  <Input
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('description')}</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('price')} (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>{t('category')}</Label>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('image')} (URL)</Label>
                <Input
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isMenuItemEdit"
                    checked={editForm.isMenuItem}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isMenuItem: checked === true })
                    }
                  />
                  <Label htmlFor="isMenuItemEdit">{t('isMenuItem')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCompositeEdit"
                    checked={editForm.isComposite}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isComposite: checked === true })
                    }
                  />
                  <Label htmlFor="isCompositeEdit">{t('isComposite')}</Label>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {tc('save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                  {tc('cancel')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-2xl">
              <div>
                <span className="text-sm text-muted-foreground">{t('code')}</span>
                <p className="font-medium">{product.code || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('category')}</span>
                <p className="font-medium">{product.category || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('price')}</span>
                <p className="font-medium">{Number(product.price).toFixed(2)} TL</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('cost')}</span>
                <p className="font-medium">{product.calculatedCost.toFixed(2)} TL</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('profitMargin')}</span>
                <p
                  className={
                    product.profitMargin > 50
                      ? 'font-medium text-green-600'
                      : product.profitMargin > 20
                        ? 'font-medium text-yellow-600'
                        : 'font-medium text-red-600'
                  }
                >
                  %{product.profitMargin.toFixed(1)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('description')}</span>
                <p className="font-medium">{product.description || '-'}</p>
              </div>
              <div className="flex gap-4">
                {product.isMenuItem && <Badge variant="default">Menu</Badge>}
                {product.isComposite && <Badge variant="outline">Kompozit</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Ingredients / Recipe */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('ingredients')}</CardTitle>
          <Button onClick={() => setIngredientDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('addIngredient')}
          </Button>
        </CardHeader>
        <CardContent>
          {product.ingredients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('noIngredients')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead>{t('unit')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell>
                      {ingredient.rawMaterial ? (
                        <Badge variant="secondary">{t('rawMaterial')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('subProduct')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ingredient.rawMaterial?.name || ingredient.subProduct?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(ingredient.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(tc('confirm') + '?')) {
                            removeIngredientMutation.mutate(ingredient.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {costBreakdown && costBreakdown.ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('costBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead>{t('unit')}</TableHead>
                  <TableHead className="text-right">{t('unitCost')} (TL)</TableHead>
                  <TableHead className="text-right">{t('ingredientCost')} (TL)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costBreakdown.ingredients.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.type === 'raw_material' ? (
                        <Badge variant="secondary">{t('rawMaterial')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('subProduct')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">
                      {(item.unitPrice ?? item.unitCost ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={5} className="text-right font-bold">
                    {t('totalCost')}:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {costBreakdown.totalCost.toFixed(2)} TL
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={5} className="text-right font-bold">
                    {t('price')}:
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {costBreakdown.price.toFixed(2)} TL
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={5} className="text-right font-bold">
                    {t('profitMargin')}:
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      costBreakdown.profitMargin > 50
                        ? 'text-green-600'
                        : costBreakdown.profitMargin > 20
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    %{costBreakdown.profitMargin.toFixed(1)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Ingredient Dialog */}
      <Dialog open={ingredientDialogOpen} onOpenChange={setIngredientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addIngredient')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIngredientSubmit} className="space-y-4">
            <div>
              <Label>{t('selectType')}</Label>
              <Select
                value={ingredientType}
                onValueChange={(v) => setIngredientType(v as 'raw_material' | 'sub_product')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw_material">{t('rawMaterial')}</SelectItem>
                  <SelectItem value="sub_product">{t('subProduct')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ingredientType === 'raw_material' ? (
              <div>
                <Label>{t('selectMaterial')}</Label>
                <Select
                  value={ingredientForm.rawMaterialId}
                  onValueChange={(v) =>
                    setIngredientForm({ ...ingredientForm, rawMaterialId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectMaterial')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.unit} - {Number(m.lastPurchasePrice).toFixed(2)} TL)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>{t('selectProduct')}</Label>
                <Select
                  value={ingredientForm.subProductId}
                  onValueChange={(v) =>
                    setIngredientForm({ ...ingredientForm, subProductId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectProduct')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('quantity')}</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={ingredientForm.quantity}
                  onChange={(e) =>
                    setIngredientForm({
                      ...ingredientForm,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label>{t('unit')}</Label>
                <Select
                  value={ingredientForm.unit}
                  onValueChange={(v) => setIngredientForm({ ...ingredientForm, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {ti(`units.${u}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetIngredientForm}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={addIngredientMutation.isPending}>
                {tc('save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/products/\[id\]/page.tsx
git commit -m "feat(frontend): add product detail page with recipe management and cost breakdown"
```

---

## Chunk 5: Integration and Final Wiring

### Task 17: Update sidebar navigation

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add inventory and product links to sidebar**

Add the following nav items to the sidebar's navigation array (after finance items, before menu items):

```typescript
// In the nav items array, add:
{
  title: t('nav.inventory'),
  href: '/dashboard/inventory',
  icon: Package,
  roles: ['ADMIN', 'STOCK_MANAGER'],
  children: [
    { title: t('inventory.rawMaterials'), href: '/dashboard/inventory' },
    { title: t('inventory.movements'), href: '/dashboard/inventory/movements' },
  ],
},
{
  title: t('nav.products'),
  href: '/dashboard/products',
  icon: UtensilsCrossed,
  roles: ['ADMIN', 'MENU_MANAGER'],
},
```

Import the icons at the top:

```typescript
import { Package, UtensilsCrossed } from 'lucide-react';
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/sidebar.tsx
git commit -m "feat(frontend): add inventory and products navigation links to sidebar"
```

---

### Task 18: Verify full build

- [ ] **Step 1: Build backend**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 2: Build frontend**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete inventory and product/recipe module (Plan 4)"
```

---

## Summary

This plan establishes:

- **Inventory Backend:** `InventoryModule` with `RawMaterialController`/`Service` (full CRUD) and `StockMovementController`/`Service` (create + list with transactional stock level updates). Low stock detection via raw SQL for column comparison. Role-guarded for ADMIN and STOCK_MANAGER.
- **Product Backend:** `ProductModule` with `ProductController`/`Service` (full CRUD), ingredient management (add/update/remove with raw material or sub-product references), recursive cost calculation with unit conversion (GR/KG, ML/LT), cost breakdown endpoint, circular dependency detection. Role-guarded for ADMIN and MENU_MANAGER.
- **Cost Calculation:** Raw material cost = quantity (converted to base unit) x lastPurchasePrice. Product cost = sum of ingredient costs (recursive for sub-products). Profit margin = (price - cost) / price. Example: Kofte = 150g kiyma (0.15kg x 320 TL/kg = 48 TL) + 5g baharat (0.005kg x 200 TL/kg = 1 TL) = 49 TL.
- **Frontend Inventory:** Raw materials list with low stock alert banner, inline CRUD dialog, stock status badges. Stock movements page with IN/OUT creation, supplier/invoice tracking, total value calculation.
- **Frontend Products:** Products list with computed cost and profit margin columns (color-coded). New product creation page. Product detail page with inline editing, ingredient/recipe management (add raw materials or sub-products), and full cost breakdown table showing per-ingredient costs, totals, and profit margin.
- **i18n:** Turkish translations for all inventory and product module strings.

**Next plans to implement:**
- Plan 5: Menu + QR Menu Module (consumes Product data, manages menu items and public QR menu)
- Plan 6: Reporting Module
