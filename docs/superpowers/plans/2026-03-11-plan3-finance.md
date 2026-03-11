# Plan 3: Finance Module — Expenses, Revenue, Distribution, Summary

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Finance module — expense CRUD, daily revenue entry, expense distribution system (NONE, EQUAL, REVENUE_BASED), finance summary endpoint, and all frontend pages for managing restaurant finances.

**Architecture:** Extends the existing monorepo from Plan 1. Backend adds a new `FinanceModule` to NestJS with controllers and services for expenses, revenues, and distribution logic. Frontend adds finance pages under `/dashboard/finance/`. All endpoints are protected by JWT + Role guards (ADMIN, ACCOUNTANT).

**Tech Stack:** NestJS, Next.js, Prisma, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui, TanStack Query, Recharts, next-intl

**Spec:** `docs/superpowers/specs/2026-03-11-hepyonet-design.md`

**Depends on:** Plan 1 (Foundation) must be completed first. Uses PrismaService, SupabaseService, guards, decorators, api client, auth store, dashboard layout.

**Note on testing:** E2e and unit tests are deferred to a separate testing plan.

**Related Plans:**
- Plan 1: Foundation (prerequisite)
- Plan 2: Personnel (HR) Module
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module
- Plan 6: Reporting Module

---

## File Structure

```
hepyonet/
├── backend/
│   └── src/
│       └── finance/
│           ├── finance.module.ts
│           ├── expense.controller.ts
│           ├── expense.service.ts
│           ├── revenue.controller.ts
│           ├── revenue.service.ts
│           └── dto/
│               ├── create-expense.dto.ts
│               ├── update-expense.dto.ts
│               ├── distribute-expense.dto.ts
│               ├── create-revenue.dto.ts
│               ├── update-revenue.dto.ts
│               └── finance-summary-query.dto.ts
├── frontend/
│   └── src/
│       └── app/
│           └── dashboard/
│               └── finance/
│                   ├── page.tsx
│                   ├── expenses/
│                   │   └── page.tsx
│                   ├── revenues/
│                   │   └── page.tsx
│                   └── distribute/
│                       └── page.tsx
```

---

## Chunk 1: Backend — DTOs

### Task 1: Create Expense DTOs

**Files:**
- Create: `backend/src/finance/dto/create-expense.dto.ts`
- Create: `backend/src/finance/dto/update-expense.dto.ts`
- Create: `backend/src/finance/dto/distribute-expense.dto.ts`

- [ ] **Step 1: Create CreateExpenseDto**

```typescript
// backend/src/finance/dto/create-expense.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';

export enum ExpenseCategory {
  SALARY = 'SALARY',
  BILL = 'BILL',
  TAX = 'TAX',
  RENT = 'RENT',
  SUPPLIER = 'SUPPLIER',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsDateString()
  paymentDate: string;
}
```

- [ ] **Step 2: Create UpdateExpenseDto**

```typescript
// backend/src/finance/dto/update-expense.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { ExpenseCategory } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;
}
```

- [ ] **Step 3: Create DistributeExpenseDto**

```typescript
// backend/src/finance/dto/distribute-expense.dto.ts
import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';

export enum DistributionType {
  NONE = 'NONE',
  EQUAL = 'EQUAL',
  REVENUE_BASED = 'REVENUE_BASED',
}

export class DistributeExpenseDto {
  @IsEnum(DistributionType)
  distributionType: DistributionType;

  @IsInt()
  @Min(2)
  @Max(24)
  @IsOptional()
  distributionMonths?: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/finance/dto/create-expense.dto.ts backend/src/finance/dto/update-expense.dto.ts backend/src/finance/dto/distribute-expense.dto.ts
git commit -m "feat(finance): add expense DTOs with validation"
```

---

### Task 2: Create Revenue DTOs

**Files:**
- Create: `backend/src/finance/dto/create-revenue.dto.ts`
- Create: `backend/src/finance/dto/update-revenue.dto.ts`
- Create: `backend/src/finance/dto/finance-summary-query.dto.ts`

- [ ] **Step 1: Create CreateRevenueDto**

```typescript
// backend/src/finance/dto/create-revenue.dto.ts
import { IsNumber, IsDateString, IsString, IsOptional, Min } from 'class-validator';

export class CreateRevenueDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

- [ ] **Step 2: Create UpdateRevenueDto**

```typescript
// backend/src/finance/dto/update-revenue.dto.ts
import { IsNumber, IsDateString, IsString, IsOptional, Min } from 'class-validator';

export class UpdateRevenueDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

- [ ] **Step 3: Create FinanceSummaryQueryDto**

```typescript
// backend/src/finance/dto/finance-summary-query.dto.ts
import { IsString, Matches } from 'class-validator';

export class FinanceSummaryQueryDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/finance/dto/create-revenue.dto.ts backend/src/finance/dto/update-revenue.dto.ts backend/src/finance/dto/finance-summary-query.dto.ts
git commit -m "feat(finance): add revenue and finance summary DTOs"
```

---

## Chunk 2: Backend — Services

### Task 3: Create ExpenseService with distribution logic

**Files:**
- Create: `backend/src/finance/expense.service.ts`

- [ ] **Step 1: Write ExpenseService**

```typescript
// backend/src/finance/expense.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { DistributeExpenseDto, DistributionType } from './dto/distribute-expense.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        restaurantId,
        title: dto.title,
        amount: dto.amount,
        category: dto.category,
        paymentDate: new Date(dto.paymentDate),
      },
    });
  }

  async findAll(restaurantId: string, params?: { category?: string; startDate?: string; endDate?: string }) {
    const where: any = { restaurantId };

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.startDate || params?.endDate) {
      where.paymentDate = {};
      if (params.startDate) {
        where.paymentDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.paymentDate.lte = new Date(params.endDate);
      }
    }

    return this.prisma.expense.findMany({
      where,
      include: { distributions: true },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, restaurantId },
      include: { distributions: true },
    });

    if (!expense) {
      throw new NotFoundException('Gider bulunamadi');
    }

    return expense;
  }

  async update(restaurantId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(restaurantId, id);

    if (expense.isDistributed) {
      throw new BadRequestException(
        'Dagitimi yapilmis bir gider guncellenemez. Once dagitimi iptal edin.',
      );
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.paymentDate !== undefined && { paymentDate: new Date(dto.paymentDate) }),
      },
      include: { distributions: true },
    });
  }

  async remove(restaurantId: string, id: string) {
    const expense = await this.findOne(restaurantId, id);

    if (expense.isDistributed) {
      await this.prisma.expenseDistribution.deleteMany({
        where: { expenseId: id },
      });
    }

    await this.prisma.expense.delete({ where: { id } });

    return { message: 'Gider silindi' };
  }

  async distribute(restaurantId: string, id: string, dto: DistributeExpenseDto) {
    const expense = await this.findOne(restaurantId, id);

    if (expense.isDistributed) {
      throw new BadRequestException('Bu gider zaten dagitilmis');
    }

    if (dto.distributionType === DistributionType.NONE) {
      return this.distributeNone(expense);
    }

    if (!dto.distributionMonths || dto.distributionMonths < 2) {
      throw new BadRequestException('Dagitim ay sayisi en az 2 olmalidir');
    }

    if (dto.distributionType === DistributionType.EQUAL) {
      return this.distributeEqual(expense, dto.distributionMonths);
    }

    if (dto.distributionType === DistributionType.REVENUE_BASED) {
      return this.distributeRevenueBased(restaurantId, expense, dto.distributionMonths);
    }

    throw new BadRequestException('Gecersiz dagitim tipi');
  }

  async undistribute(restaurantId: string, id: string) {
    const expense = await this.findOne(restaurantId, id);

    if (!expense.isDistributed) {
      throw new BadRequestException('Bu gider dagitilmamis');
    }

    await this.prisma.expenseDistribution.deleteMany({
      where: { expenseId: id },
    });

    return this.prisma.expense.update({
      where: { id },
      data: {
        isDistributed: false,
        distributionType: 'NONE',
        distributionMonths: null,
      },
      include: { distributions: true },
    });
  }

  private async distributeNone(expense: any) {
    const month = this.getMonthString(expense.paymentDate);

    await this.prisma.$transaction([
      this.prisma.expenseDistribution.create({
        data: {
          expenseId: expense.id,
          month,
          amount: expense.amount,
        },
      }),
      this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          isDistributed: true,
          distributionType: 'NONE',
          distributionMonths: 1,
        },
      }),
    ]);

    return this.findOne(expense.restaurantId, expense.id);
  }

  private async distributeEqual(expense: any, months: number) {
    const totalAmount = Number(expense.amount);
    const perMonth = Math.floor((totalAmount * 100) / months) / 100;
    const remainder = Math.round((totalAmount - perMonth * months) * 100) / 100;

    const startDate = new Date(expense.paymentDate);
    const distributions: { expenseId: string; month: string; amount: number }[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const month = this.getMonthString(date);
      const amount = i === 0 ? perMonth + remainder : perMonth;

      distributions.push({
        expenseId: expense.id,
        month,
        amount,
      });
    }

    await this.prisma.$transaction([
      ...distributions.map((d) =>
        this.prisma.expenseDistribution.create({ data: d }),
      ),
      this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          isDistributed: true,
          distributionType: 'EQUAL',
          distributionMonths: months,
        },
      }),
    ]);

    return this.findOne(expense.restaurantId, expense.id);
  }

  private async distributeRevenueBased(
    restaurantId: string,
    expense: any,
    months: number,
  ) {
    const startDate = new Date(expense.paymentDate);
    const monthKeys: string[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      monthKeys.push(this.getMonthString(date));
    }

    const revenues = await Promise.all(
      monthKeys.map(async (monthKey) => {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const from = new Date(year, month - 1, 1);
        const to = new Date(year, month, 1);

        const result = await this.prisma.revenue.aggregate({
          where: {
            restaurantId,
            date: { gte: from, lt: to },
          },
          _sum: { amount: true },
        });

        return {
          month: monthKey,
          total: Number(result._sum.amount || 0),
        };
      }),
    );

    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0);

    if (totalRevenue === 0) {
      throw new BadRequestException(
        'Secilen aylarda ciro verisi bulunamadi. Ciro girilmeden gelir bazli dagitim yapilamaz.',
      );
    }

    const totalAmount = Number(expense.amount);
    let distributedSoFar = 0;

    const distributions: { expenseId: string; month: string; amount: number }[] = [];

    for (let i = 0; i < revenues.length; i++) {
      const ratio = revenues[i].total / totalRevenue;
      let amount: number;

      if (i === revenues.length - 1) {
        amount = Math.round((totalAmount - distributedSoFar) * 100) / 100;
      } else {
        amount = Math.round(totalAmount * ratio * 100) / 100;
        distributedSoFar += amount;
      }

      distributions.push({
        expenseId: expense.id,
        month: revenues[i].month,
        amount,
      });
    }

    await this.prisma.$transaction([
      ...distributions.map((d) =>
        this.prisma.expenseDistribution.create({ data: d }),
      ),
      this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          isDistributed: true,
          distributionType: 'REVENUE_BASED',
          distributionMonths: months,
        },
      }),
    ]);

    return this.findOne(expense.restaurantId, expense.id);
  }

  private getMonthString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/finance/expense.service.ts
git commit -m "feat(finance): add ExpenseService with NONE, EQUAL, REVENUE_BASED distribution logic"
```

---

### Task 4: Create RevenueService

**Files:**
- Create: `backend/src/finance/revenue.service.ts`

- [ ] **Step 1: Write RevenueService**

```typescript
// backend/src/finance/revenue.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateRevenueDto) {
    const date = new Date(dto.date);

    const existing = await this.prisma.revenue.findFirst({
      where: {
        restaurantId,
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Bu tarih icin zaten bir ciro kaydi var. Guncellemek icin mevcut kaydi duzenleyin.',
      );
    }

    return this.prisma.revenue.create({
      data: {
        restaurantId,
        date,
        amount: dto.amount,
        source: 'MANUAL',
        notes: dto.notes || null,
      },
    });
  }

  async findAll(restaurantId: string, params?: { startDate?: string; endDate?: string; month?: string }) {
    const where: any = { restaurantId };

    if (params?.month) {
      const [yearStr, monthStr] = params.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else {
      if (params?.startDate || params?.endDate) {
        where.date = {};
        if (params.startDate) {
          where.date.gte = new Date(params.startDate);
        }
        if (params.endDate) {
          where.date.lte = new Date(params.endDate);
        }
      }
    }

    return this.prisma.revenue.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, restaurantId },
    });

    if (!revenue) {
      throw new NotFoundException('Ciro kaydi bulunamadi');
    }

    return revenue;
  }

  async update(restaurantId: string, id: string, dto: UpdateRevenueDto) {
    await this.findOne(restaurantId, id);

    return this.prisma.revenue.update({
      where: { id },
      data: {
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    await this.prisma.revenue.delete({ where: { id } });
    return { message: 'Ciro kaydi silindi' };
  }

  async getMonthlySummary(restaurantId: string, month: string) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const from = new Date(year, m - 1, 1);
    const to = new Date(year, m, 1);

    const revenues = await this.prisma.revenue.findMany({
      where: {
        restaurantId,
        date: { gte: from, lt: to },
      },
      orderBy: { date: 'asc' },
    });

    const totalRevenue = revenues.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );

    const directExpenses = await this.prisma.expense.findMany({
      where: {
        restaurantId,
        isDistributed: false,
        paymentDate: { gte: from, lt: to },
      },
    });

    const distributedExpenses = await this.prisma.expenseDistribution.findMany({
      where: {
        month,
        expense: { restaurantId },
      },
      include: {
        expense: {
          select: { id: true, title: true, category: true, amount: true },
        },
      },
    });

    const totalDirectExpenses = directExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const totalDistributedExpenses = distributedExpenses.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );

    const totalExpenses = totalDirectExpenses + totalDistributedExpenses;
    const netIncome = totalRevenue - totalExpenses;

    const categoryBreakdown: Record<string, number> = {};

    for (const expense of directExpenses) {
      const cat = expense.category;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(expense.amount);
    }

    for (const dist of distributedExpenses) {
      const cat = dist.expense.category;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(dist.amount);
    }

    return {
      month,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalDirectExpenses: Math.round(totalDirectExpenses * 100) / 100,
      totalDistributedExpenses: Math.round(totalDistributedExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      revenueCount: revenues.length,
      dailyRevenues: revenues.map((r) => ({
        id: r.id,
        date: r.date,
        amount: Number(r.amount),
        notes: r.notes,
      })),
      directExpenses: directExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        category: e.category,
        paymentDate: e.paymentDate,
      })),
      distributedExpenses: distributedExpenses.map((d) => ({
        id: d.id,
        expenseId: d.expense.id,
        title: d.expense.title,
        category: d.expense.category,
        originalAmount: Number(d.expense.amount),
        distributedAmount: Number(d.amount),
        month: d.month,
      })),
      categoryBreakdown,
    };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/finance/revenue.service.ts
git commit -m "feat(finance): add RevenueService with CRUD and monthly summary"
```

---

## Chunk 3: Backend — Controllers and Module

### Task 5: Create ExpenseController

**Files:**
- Create: `backend/src/finance/expense.controller.ts`

- [ ] **Step 1: Write ExpenseController**

```typescript
// backend/src/finance/expense.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { DistributeExpenseDto } from './dto/distribute-expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ACCOUNTANT)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(restaurantId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.findAll(restaurantId, {
      category,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.findOne(restaurantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(restaurantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.remove(restaurantId, id);
  }

  @Post(':id/distribute')
  distribute(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: DistributeExpenseDto,
  ) {
    return this.expenseService.distribute(restaurantId, id, dto);
  }

  @Post(':id/undistribute')
  undistribute(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.undistribute(restaurantId, id);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/finance/expense.controller.ts
git commit -m "feat(finance): add ExpenseController with CRUD and distribute endpoints"
```

---

### Task 6: Create RevenueController with finance summary

**Files:**
- Create: `backend/src/finance/revenue.controller.ts`

- [ ] **Step 1: Write RevenueController**

```typescript
// backend/src/finance/revenue.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('revenues')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ACCOUNTANT)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateRevenueDto,
  ) {
    return this.revenueService.create(restaurantId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    return this.revenueService.findAll(restaurantId, {
      startDate,
      endDate,
      month,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.revenueService.findOne(restaurantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRevenueDto,
  ) {
    return this.revenueService.update(restaurantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.revenueService.remove(restaurantId, id);
  }

  @Get('summary/monthly')
  getMonthlySummary(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('month') month: string,
  ) {
    return this.revenueService.getMonthlySummary(restaurantId, month);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/finance/revenue.controller.ts
git commit -m "feat(finance): add RevenueController with CRUD and monthly summary"
```

---

### Task 7: Create FinanceModule and register in AppModule

**Files:**
- Create: `backend/src/finance/finance.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write FinanceModule**

```typescript
// backend/src/finance/finance.module.ts
import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';

@Module({
  controllers: [ExpenseController, RevenueController],
  providers: [ExpenseService, RevenueService],
  exports: [ExpenseService, RevenueService],
})
export class FinanceModule {}
```

- [ ] **Step 2: Register FinanceModule in AppModule**

Add `FinanceModule` to the imports array in `backend/src/app.module.ts`:

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
import { AdminModule } from './admin/admin.module';
import { FinanceModule } from './finance/finance.module';

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
    FinanceModule,
  ],
})
export class AppModule {}
```

Note: If Plan 2 (Personnel) was implemented first, `PersonnelModule` will also be in the imports array. Preserve any existing imports and add `FinanceModule` after them.

- [ ] **Step 3: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/finance/finance.module.ts backend/src/app.module.ts
git commit -m "feat(finance): add FinanceModule and register in AppModule"
```

---

## Chunk 4: Frontend — Finance Overview Page

### Task 8: Add finance translations to tr.json

**Files:**
- Modify: `frontend/messages/tr.json`

- [ ] **Step 1: Add finance section to tr.json**

Add the following keys under the root object in `frontend/messages/tr.json`:

```json
{
  "finance": {
    "title": "Finans",
    "overview": "Finans Ozeti",
    "expenses": "Giderler",
    "revenues": "Cirolar",
    "distribute": "Gider Dagitimi",
    "addExpense": "Gider Ekle",
    "addRevenue": "Ciro Ekle",
    "totalRevenue": "Toplam Ciro",
    "totalExpenses": "Toplam Gider",
    "netIncome": "Net Gelir",
    "directExpenses": "Dogrudan Giderler",
    "distributedExpenses": "Dagitilmis Giderler",
    "category": "Kategori",
    "amount": "Tutar",
    "date": "Tarih",
    "paymentDate": "Odeme Tarihi",
    "title_field": "Baslik",
    "notes": "Notlar",
    "actions": "Islemler",
    "edit": "Duzenle",
    "delete": "Sil",
    "save": "Kaydet",
    "cancel": "Iptal",
    "distributionType": "Dagitim Tipi",
    "distributionMonths": "Dagitim Ay Sayisi",
    "distributeAction": "Dagit",
    "undistribute": "Dagitimi Iptal Et",
    "distributed": "Dagitildi",
    "notDistributed": "Dagitilmadi",
    "none": "Dagitim Yok",
    "equal": "Esit Dagitim",
    "revenueBased": "Ciro Bazli Dagitim",
    "month": "Ay",
    "selectMonth": "Ay Secin",
    "noData": "Veri bulunamadi",
    "confirmDelete": "Bu kaydi silmek istediginize emin misiniz?",
    "salary": "Maas",
    "bill": "Fatura",
    "tax": "Vergi",
    "rent": "Kira",
    "supplier": "Tedarikci",
    "other": "Diger",
    "dailyRevenues": "Gunluk Cirolar",
    "categoryBreakdown": "Kategori Dagilimi",
    "source": "Kaynak",
    "manual": "Manuel",
    "api": "API",
    "revenueCount": "Ciro Kayit Sayisi",
    "expenseDistributions": "Gider Dagitimlari",
    "originalAmount": "Orijinal Tutar",
    "distributedAmount": "Dagitilan Tutar",
    "ratio": "Oran",
    "totalDistributed": "Toplam Dagitilan",
    "monthlyTrend": "Aylik Trend"
  }
}
```

Merge this into the existing `tr.json` as a top-level `"finance"` key alongside existing keys like `"auth"`, `"dashboard"`, etc.

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/tr.json
git commit -m "feat(finance): add Turkish translations for finance module"
```

---

### Task 9: Create Finance Overview page

**Files:**
- Create: `frontend/src/app/dashboard/finance/page.tsx`

- [ ] **Step 1: Write Finance Overview page**

```tsx
// frontend/src/app/dashboard/finance/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  DollarSign,
  Receipt,
  PieChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2'];

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maas',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikci',
  OTHER: 'Diger',
};

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export default function FinanceOverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const { data: summary, isLoading } = useQuery({
    queryKey: ['finance-summary', selectedMonth],
    queryFn: async () => {
      const { data } = await api.get('/revenues/summary/monthly', {
        params: { month: selectedMonth },
      });
      return data;
    },
  });

  const categoryData = useMemo(() => {
    if (!summary?.categoryBreakdown) return [];
    return Object.entries(summary.categoryBreakdown).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value: value as number,
    }));
  }, [summary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finans Ozeti</h1>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/finance/expenses">
          <Button variant="outline" className="gap-2">
            <Receipt className="h-4 w-4" />
            Giderler
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/dashboard/finance/revenues">
          <Button variant="outline" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Cirolar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/dashboard/finance/distribute">
          <Button variant="outline" className="gap-2">
            <PieChart className="h-4 w-4" />
            Gider Dagitimi
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Yukleniyor...</p>
        </div>
      ) : !summary ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Bu ay icin veri bulunamadi</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Toplam Ciro
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalRevenue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.revenueCount} gun ciro girisi
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Toplam Gider
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpenses)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dogrudan: {formatCurrency(summary.totalDirectExpenses)} | Dagitilan: {formatCurrency(summary.totalDistributedExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Net Gelir
                </CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(summary.netIncome)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ciro - Gider
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gunluk Ciro</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.dailyRevenues.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Bu ay icin ciro verisi yok
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={summary.dailyRevenues.map((r: any) => ({
                        date: new Date(r.date).getDate().toString(),
                        amount: r.amount,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          'Ciro',
                        ]}
                      />
                      <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gider Kategorileri</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Bu ay icin gider verisi yok
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {summary.distributedExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Bu Aya Dagitilan Giderler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Gider</th>
                        <th className="text-left py-2 px-3 font-medium">Kategori</th>
                        <th className="text-right py-2 px-3 font-medium">Orijinal Tutar</th>
                        <th className="text-right py-2 px-3 font-medium">Bu Aya Dusen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.distributedExpenses.map((d: any) => (
                        <tr key={d.id} className="border-b last:border-0">
                          <td className="py-2 px-3">{d.title}</td>
                          <td className="py-2 px-3">
                            {CATEGORY_LABELS[d.category] || d.category}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatCurrency(d.originalAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(d.distributedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/finance/page.tsx
git commit -m "feat(finance): add finance overview page with summary cards and charts"
```

---

## Chunk 5: Frontend — Expenses Page

### Task 10: Create Expenses list and add page

**Files:**
- Create: `frontend/src/app/dashboard/finance/expenses/page.tsx`

- [ ] **Step 1: Write Expenses page**

```tsx
// frontend/src/app/dashboard/finance/expenses/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'SALARY', label: 'Maas' },
  { value: 'BILL', label: 'Fatura' },
  { value: 'TAX', label: 'Vergi' },
  { value: 'RENT', label: 'Kira' },
  { value: 'SUPPLIER', label: 'Tedarikci' },
  { value: 'OTHER', label: 'Diger' },
];

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maas',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikci',
  OTHER: 'Diger',
};

interface ExpenseForm {
  title: string;
  amount: string;
  category: string;
  paymentDate: string;
}

const emptyForm: ExpenseForm = {
  title: '',
  amount: '',
  category: 'OTHER',
  paymentDate: new Date().toISOString().split('T')[0],
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterCategory],
    queryFn: async () => {
      const params: any = {};
      if (filterCategory !== 'ALL') {
        params.category = filterCategory;
      }
      const { data } = await api.get('/expenses', { params });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/expenses', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddOpen(false);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Gider eklenemedi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/expenses/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Gider guncellenemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      paymentDate: form.paymentDate,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        paymentDate: form.paymentDate,
      },
    });
  };

  const handleEdit = (expense: any) => {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      paymentDate: new Date(expense.paymentDate).toISOString().split('T')[0],
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu gideri silmek istediginize emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Giderler</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={() => {
                setForm(emptyForm);
                setError('');
              }}
            >
              <Plus className="h-4 w-4" />
              Gider Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Gider</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Baslik</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Tutar (TL)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Odeme Tarihi</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) =>
                    setForm({ ...form, paymentDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Iptal
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gider Duzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Baslik</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Tutar (TL)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paymentDate">Odeme Tarihi</Label>
              <Input
                id="edit-paymentDate"
                type="date"
                value={form.paymentDate}
                onChange={(e) =>
                  setForm({ ...form, paymentDate: e.target.value })
                }
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Iptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3">
        <Label>Kategori Filtresi:</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tumu</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gider Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-center py-8">Yukleniyor...</p>
          ) : expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Henuz gider kaydi yok
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Baslik</th>
                    <th className="text-left py-2 px-3 font-medium">Kategori</th>
                    <th className="text-right py-2 px-3 font-medium">Tutar</th>
                    <th className="text-left py-2 px-3 font-medium">Odeme Tarihi</th>
                    <th className="text-center py-2 px-3 font-medium">Dagitim</th>
                    <th className="text-right py-2 px-3 font-medium">Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: any) => (
                    <tr key={expense.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3">{expense.title}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="py-2 px-3">
                        {formatDate(expense.paymentDate)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {expense.isDistributed ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {expense.distributionType === 'EQUAL'
                              ? `Esit (${expense.distributionMonths} ay)`
                              : expense.distributionType === 'REVENUE_BASED'
                              ? `Ciro Bazli (${expense.distributionMonths} ay)`
                              : 'Dagitildi'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Dagitilmadi</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                            disabled={expense.isDistributed}
                            title={
                              expense.isDistributed
                                ? 'Dagitimi iptal etmeden duzenlenemez'
                                : 'Duzenle'
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/finance/expenses/page.tsx
git commit -m "feat(finance): add expenses list page with CRUD dialogs and category filter"
```

---

## Chunk 6: Frontend — Revenue Entry Page

### Task 11: Create Revenues page with daily entry

**Files:**
- Create: `frontend/src/app/dashboard/finance/revenues/page.tsx`

- [ ] **Step 1: Write Revenues page**

```tsx
// frontend/src/app/dashboard/finance/revenues/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

interface RevenueForm {
  date: string;
  amount: string;
  notes: string;
}

const emptyForm: RevenueForm = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  notes: '',
};

export default function RevenuesPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RevenueForm>(emptyForm);
  const [error, setError] = useState('');

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues', selectedMonth],
    queryFn: async () => {
      const { data } = await api.get('/revenues', {
        params: { month: selectedMonth },
      });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/revenues', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setIsAddOpen(false);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ciro eklenemedi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/revenues/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setIsEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ciro guncellenemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/revenues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      date: form.date,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        date: form.date,
        amount: parseFloat(form.amount),
        notes: form.notes || undefined,
      },
    });
  };

  const handleEdit = (revenue: any) => {
    setEditingId(revenue.id);
    setForm({
      date: new Date(revenue.date).toISOString().split('T')[0],
      amount: String(revenue.amount),
      notes: revenue.notes || '',
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu ciro kaydini silmek istediginize emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const totalRevenue = revenues.reduce(
    (sum: number, r: any) => sum + Number(r.amount),
    0,
  );

  const chartData = revenues
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    .map((r: any) => ({
      date: new Date(r.date).getDate().toString().padStart(2, '0'),
      amount: Number(r.amount),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gunluk Ciro Girisi</h1>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => {
                  setForm(emptyForm);
                  setError('');
                }}
              >
                <Plus className="h-4 w-4" />
                Ciro Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gunluk Ciro Girisi</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="date">Tarih</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Ciro Tutari (TL)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Iptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ciro Duzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-date">Tarih</Label>
              <Input
                id="edit-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Ciro Tutari (TL)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notlar (Opsiyonel)</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Iptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Aylik Toplam Ciro
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {revenues.length} gun ciro girisi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Gunluk Ortalama
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {revenues.length > 0
                ? formatCurrency(totalRevenue / revenues.length)
                : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gunluk Ciro Grafigi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    'Ciro',
                  ]}
                />
                <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ciro Kayitlari</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-center py-8">Yukleniyor...</p>
          ) : revenues.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Bu ay icin ciro kaydi yok
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Tarih</th>
                    <th className="text-right py-2 px-3 font-medium">Tutar</th>
                    <th className="text-left py-2 px-3 font-medium">Notlar</th>
                    <th className="text-left py-2 px-3 font-medium">Kaynak</th>
                    <th className="text-right py-2 px-3 font-medium">Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map((revenue: any) => (
                    <tr
                      key={revenue.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3">
                        {formatDate(revenue.date)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(Number(revenue.amount))}
                      </td>
                      <td className="py-2 px-3 text-gray-600 max-w-xs truncate">
                        {revenue.notes || '-'}
                      </td>
                      <td className="py-2 px-3">
                        {revenue.source === 'MANUAL' ? 'Manuel' : 'API'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(revenue)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(revenue.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/finance/revenues/page.tsx
git commit -m "feat(finance): add revenue entry page with daily CRUD, chart, and monthly filter"
```

---

## Chunk 7: Frontend — Distribution Page

### Task 12: Create Expense Distribution page

**Files:**
- Create: `frontend/src/app/dashboard/finance/distribute/page.tsx`

- [ ] **Step 1: Write Distribution page**

```tsx
// frontend/src/app/dashboard/finance/distribute/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Split, Undo2, Info, AlertTriangle } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maas',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikci',
  OTHER: 'Diger',
};

const DISTRIBUTION_TYPE_LABELS: Record<string, string> = {
  NONE: 'Dagitim Yok (Tek Aya Yaz)',
  EQUAL: 'Esit Dagitim',
  REVENUE_BASED: 'Ciro Bazli Dagitim',
};

export default function DistributePage() {
  const queryClient = useQueryClient();
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [distributionType, setDistributionType] = useState<string>('NONE');
  const [distributionMonths, setDistributionMonths] = useState<string>('3');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-all'],
    queryFn: async () => {
      const { data } = await api.get('/expenses');
      return data;
    },
  });

  const distributeMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { distributionType: string; distributionMonths?: number };
    }) => {
      const res = await api.post(`/expenses/${id}/distribute`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setIsDialogOpen(false);
      setSelectedExpenseId(null);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Dagitim yapilamadi');
    },
  });

  const undistributeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/expenses/${id}/undistribute`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Dagitim iptal edilemedi');
    },
  });

  const openDistributeDialog = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setDistributionType('NONE');
    setDistributionMonths('3');
    setError('');
    setIsDialogOpen(true);
  };

  const handleDistribute = () => {
    if (!selectedExpenseId) return;

    const data: { distributionType: string; distributionMonths?: number } = {
      distributionType,
    };

    if (distributionType !== 'NONE') {
      data.distributionMonths = parseInt(distributionMonths, 10);
    }

    distributeMutation.mutate({ id: selectedExpenseId, data });
  };

  const handleUndistribute = (id: string) => {
    if (
      window.confirm(
        'Bu giderin dagitimini iptal etmek istediginize emin misiniz? Tum dagitim kayitlari silinecektir.',
      )
    ) {
      undistributeMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const undistributedExpenses = expenses.filter((e: any) => !e.isDistributed);
  const distributedExpenses = expenses.filter((e: any) => e.isDistributed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gider Dagitimi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Giderleri aylara dagitarak daha dogru finansal raporlama yapin
          </p>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Dagitim Yok (NONE):</strong> Gider, odeme tarihindeki aya
                yazilir. Tek seferlik giderler icin uygundur.
              </p>
              <p>
                <strong>Esit Dagitim (EQUAL):</strong> Gider belirtilen ay sayisina
                esit bolunur. Ornegin 9.000 TL / 3 ay = her aya 3.000 TL.
              </p>
              <p>
                <strong>Ciro Bazli Dagitim (REVENUE_BASED):</strong> Gider
                belirtilen aylara ciro oraninda dagitilir. Ornegin Ocak=100k,
                Subat=120k, Mart=180k ise dagitim %25 / %30 / %45 oraninda
                yapilir. Dagitim yapilabilmesi icin ilgili aylarda ciro verisi
                girilmis olmalidir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gider Dagitimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {selectedExpenseId && (
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <p className="font-medium">
                  {expenses.find((e: any) => e.id === selectedExpenseId)?.title}
                </p>
                <p className="text-gray-600">
                  {formatCurrency(
                    Number(
                      expenses.find((e: any) => e.id === selectedExpenseId)
                        ?.amount,
                    ),
                  )}{' '}
                  -{' '}
                  {formatDate(
                    expenses.find((e: any) => e.id === selectedExpenseId)
                      ?.paymentDate,
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Dagitim Tipi</Label>
              <Select
                value={distributionType}
                onValueChange={setDistributionType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">
                    Dagitim Yok (Tek Aya Yaz)
                  </SelectItem>
                  <SelectItem value="EQUAL">Esit Dagitim</SelectItem>
                  <SelectItem value="REVENUE_BASED">
                    Ciro Bazli Dagitim
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributionType !== 'NONE' && (
              <div className="space-y-2">
                <Label>Dagitim Ay Sayisi</Label>
                <Input
                  type="number"
                  min="2"
                  max="24"
                  value={distributionMonths}
                  onChange={(e) => setDistributionMonths(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Odeme tarihinden itibaren kac aya dagitilacagini belirtin (2-24
                  ay)
                </p>
              </div>
            )}

            {distributionType === 'EQUAL' && selectedExpenseId && (
              <div className="p-3 bg-green-50 rounded-md text-sm text-green-800">
                <p>
                  Her aya dusecek tutar:{' '}
                  <strong>
                    {formatCurrency(
                      Number(
                        expenses.find((e: any) => e.id === selectedExpenseId)
                          ?.amount,
                      ) / parseInt(distributionMonths || '1', 10),
                    )}
                  </strong>
                </p>
              </div>
            )}

            {distributionType === 'REVENUE_BASED' && (
              <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Ciro bazli dagitim icin ilgili aylarda ciro verisi girilmis
                  olmalidir. Ciro verisi olmayan aylar icin dagitim yapilamaz.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Iptal
              </Button>
              <Button
                onClick={handleDistribute}
                disabled={distributeMutation.isPending}
              >
                {distributeMutation.isPending ? 'Dagitiliyor...' : 'Dagit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Yukleniyor...</p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dagitilmamis Giderler ({undistributedExpenses.length})
              </CardTitle>
              <CardDescription>
                Asagidaki giderler henuz aylara dagitilmamistir
              </CardDescription>
            </CardHeader>
            <CardContent>
              {undistributedExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Dagitilacak gider yok
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">
                          Baslik
                        </th>
                        <th className="text-left py-2 px-3 font-medium">
                          Kategori
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          Tutar
                        </th>
                        <th className="text-left py-2 px-3 font-medium">
                          Odeme Tarihi
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          Islem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {undistributedExpenses.map((expense: any) => (
                        <tr
                          key={expense.id}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >
                          <td className="py-2 px-3">{expense.title}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline">
                              {CATEGORY_LABELS[expense.category] ||
                                expense.category}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(Number(expense.amount))}
                          </td>
                          <td className="py-2 px-3">
                            {formatDate(expense.paymentDate)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() =>
                                openDistributeDialog(expense.id)
                              }
                            >
                              <Split className="h-3 w-3" />
                              Dagit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dagitilmis Giderler ({distributedExpenses.length})
              </CardTitle>
              <CardDescription>
                Aylara dagitilmis giderler ve dagitim detaylari
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distributedExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Dagitilmis gider yok
                </p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {distributedExpenses.map((expense: any) => (
                    <AccordionItem key={expense.id} value={expense.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {expense.title}
                            </span>
                            <Badge variant="outline">
                              {CATEGORY_LABELS[expense.category] ||
                                expense.category}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              {DISTRIBUTION_TYPE_LABELS[
                                expense.distributionType
                              ] || expense.distributionType}
                            </Badge>
                          </div>
                          <span className="font-medium text-right mr-2">
                            {formatCurrency(Number(expense.amount))}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 font-medium">
                                    Ay
                                  </th>
                                  <th className="text-right py-2 px-3 font-medium">
                                    Dagitilan Tutar
                                  </th>
                                  <th className="text-right py-2 px-3 font-medium">
                                    Oran
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {expense.distributions
                                  ?.sort(
                                    (a: any, b: any) =>
                                      a.month.localeCompare(b.month),
                                  )
                                  .map((dist: any) => {
                                    const ratio =
                                      Number(expense.amount) > 0
                                        ? (Number(dist.amount) /
                                            Number(expense.amount)) *
                                          100
                                        : 0;
                                    return (
                                      <tr
                                        key={dist.id}
                                        className="border-b last:border-0"
                                      >
                                        <td className="py-2 px-3">
                                          {dist.month}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          {formatCurrency(Number(dist.amount))}
                                        </td>
                                        <td className="py-2 px-3 text-right text-gray-600">
                                          %{ratio.toFixed(1)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-red-600 hover:text-red-700"
                              onClick={() =>
                                handleUndistribute(expense.id)
                              }
                              disabled={undistributeMutation.isPending}
                            >
                              <Undo2 className="h-3 w-3" />
                              Dagitimi Iptal Et
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/finance/distribute/page.tsx
git commit -m "feat(finance): add expense distribution page with NONE/EQUAL/REVENUE_BASED support"
```

---

## Chunk 8: Final Verification

### Task 13: Full build verification and final commit

- [ ] **Step 1: Verify backend builds**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify frontend builds**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify all finance files exist**

```bash
ls -la /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend/src/finance/
ls -la /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend/src/finance/dto/
ls -la /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend/src/app/dashboard/finance/
ls -la /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend/src/app/dashboard/finance/expenses/
ls -la /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend/src/app/dashboard/finance/revenues/
ls -la /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend/src/app/dashboard/finance/distribute/
```

Expected files:
- `backend/src/finance/finance.module.ts`
- `backend/src/finance/expense.controller.ts`
- `backend/src/finance/expense.service.ts`
- `backend/src/finance/revenue.controller.ts`
- `backend/src/finance/revenue.service.ts`
- `backend/src/finance/dto/create-expense.dto.ts`
- `backend/src/finance/dto/update-expense.dto.ts`
- `backend/src/finance/dto/distribute-expense.dto.ts`
- `backend/src/finance/dto/create-revenue.dto.ts`
- `backend/src/finance/dto/update-revenue.dto.ts`
- `backend/src/finance/dto/finance-summary-query.dto.ts`
- `frontend/src/app/dashboard/finance/page.tsx`
- `frontend/src/app/dashboard/finance/expenses/page.tsx`
- `frontend/src/app/dashboard/finance/revenues/page.tsx`
- `frontend/src/app/dashboard/finance/distribute/page.tsx`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(finance): complete Finance module — expenses, revenues, distribution, summary"
```

---

## Summary

This plan establishes:
- **Backend:** FinanceModule with ExpenseController/Service (full CRUD + distribute/undistribute), RevenueController/Service (full CRUD + monthly summary), 6 DTOs with class-validator validation
- **Distribution Logic:** Three modes — NONE (single month), EQUAL (split evenly across N months with remainder handling), REVENUE_BASED (proportional to monthly revenue with zero-revenue guard)
- **Finance Summary:** Aggregates direct expenses, distributed expense portions, daily revenues, category breakdown, and net income for any given month
- **Frontend:** Finance overview with summary cards + Recharts visualizations, expenses list with CRUD dialogs and category filter, daily revenue entry with chart, distribution management screen with accordion detail view
- **Security:** All endpoints protected by JwtAuthGuard + RestaurantGuard + RolesGuard, accessible only by ADMIN and ACCOUNTANT roles

**Next plans to implement:**
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module
- Plan 6: Reporting Module
