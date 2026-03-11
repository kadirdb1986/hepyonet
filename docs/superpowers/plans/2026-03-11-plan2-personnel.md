# Plan 2: Personnel (HR) Module — CRUD, Leave Management, Work Days

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Personnel (HR) module — personnel CRUD, leave request creation and approval/rejection, work days tracking — with full backend API and frontend pages.

**Architecture:** Uses the existing monorepo from Plan 1. Backend NestJS module with controller, service, and DTOs. Frontend Next.js pages under `/dashboard/personnel` using shadcn/ui components and TanStack Query for data fetching.

**Tech Stack:** NestJS, Next.js, Prisma, PostgreSQL (Supabase), Supabase Auth (server-side), Tailwind CSS, shadcn/ui, Zustand, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-11-hepyonet-design.md`

**Depends on:** Plan 1 (Foundation) — PrismaService, SupabaseService, JwtAuthGuard, RolesGuard, RestaurantGuard, CurrentUser decorator, Roles decorator, api client, auth store, dashboard layout, shadcn/ui components

**Note on testing:** E2e and unit tests are deferred to a separate testing plan to keep this module plan focused. Test file paths are not listed in the file structure.

**Note on Prisma schema:** The `Personnel` and `LeaveRecord` models already exist in `backend/prisma/schema.prisma` from Plan 1. No schema changes are needed.

**Related Plans:**
- Plan 1: Foundation (prerequisite)
- Plan 3: Finance Module
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module
- Plan 6: Reporting Module

---

## File Structure

```
hepyonet/
├── backend/
│   └── src/
│       ├── app.module.ts                          (modify: add PersonnelModule)
│       └── personnel/
│           ├── personnel.module.ts
│           ├── personnel.controller.ts
│           ├── personnel.service.ts
│           └── dto/
│               ├── create-personnel.dto.ts
│               ├── update-personnel.dto.ts
│               ├── create-leave.dto.ts
│               └── update-leave-status.dto.ts
├── frontend/
│   ├── messages/
│   │   └── tr.json                                (modify: add personnel translations)
│   └── src/
│       └── app/
│           └── dashboard/
│               └── personnel/
│                   ├── page.tsx                    (list with table)
│                   ├── new/
│                   │   └── page.tsx                (add form)
│                   └── [id]/
│                       └── page.tsx                (detail + leaves)
```

---

## Chunk 1: Backend Personnel DTOs

### Task 1: Create Personnel DTOs

**Files:**
- Create: `backend/src/personnel/dto/create-personnel.dto.ts`
- Create: `backend/src/personnel/dto/update-personnel.dto.ts`
- Create: `backend/src/personnel/dto/create-leave.dto.ts`
- Create: `backend/src/personnel/dto/update-leave-status.dto.ts`

- [ ] **Step 1: Create CreatePersonnelDto**

```typescript
// backend/src/personnel/dto/create-personnel.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonnelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  surname: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  tcNo?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsDateString()
  startDate: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salary: number;
}
```

- [ ] **Step 2: Create UpdatePersonnelDto**

```typescript
// backend/src/personnel/dto/update-personnel.dto.ts
import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonnelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  tcNo?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  salary?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

- [ ] **Step 3: Create CreateLeaveDto**

```typescript
// backend/src/personnel/dto/create-leave.dto.ts
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(LeaveType)
  type: LeaveType;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

- [ ] **Step 4: Create UpdateLeaveStatusDto**

```typescript
// backend/src/personnel/dto/update-leave-status.dto.ts
import { IsEnum } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class UpdateLeaveStatusDto {
  @IsEnum(LeaveStatus)
  status: LeaveStatus;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/personnel/dto/
git commit -m "feat(personnel): add DTOs for personnel CRUD and leave management"
```

---

## Chunk 2: Backend Personnel Service

### Task 2: Create PersonnelService

**Files:**
- Create: `backend/src/personnel/personnel.service.ts`

- [ ] **Step 1: Write PersonnelService**

```typescript
// backend/src/personnel/personnel.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreatePersonnelDto) {
    return this.prisma.personnel.create({
      data: {
        restaurantId,
        name: dto.name,
        surname: dto.surname,
        phone: dto.phone,
        tcNo: dto.tcNo,
        position: dto.position,
        startDate: new Date(dto.startDate),
        salary: new Prisma.Decimal(dto.salary),
      },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.personnel.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        surname: true,
        phone: true,
        position: true,
        startDate: true,
        salary: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
      include: {
        leaveRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    return personnel;
  }

  async update(id: string, restaurantId: string, dto: UpdatePersonnelDto) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    const data: any = { ...dto };
    if (dto.startDate) {
      data.startDate = new Date(dto.startDate);
    }
    if (dto.salary !== undefined) {
      data.salary = new Prisma.Decimal(dto.salary);
    }

    return this.prisma.personnel.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    return this.prisma.personnel.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- Leave Management ---

  async createLeave(personnelId: string, restaurantId: string, dto: CreateLeaveDto) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id: personnelId, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('Bitis tarihi baslangic tarihinden once olamaz');
    }

    const overlapping = await this.prisma.leaveRecord.findFirst({
      where: {
        personnelId,
        status: { not: 'REJECTED' },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Bu tarih araliginda zaten bir izin kaydi mevcut');
    }

    return this.prisma.leaveRecord.create({
      data: {
        restaurantId,
        personnelId,
        startDate,
        endDate,
        type: dto.type,
        notes: dto.notes,
      },
    });
  }

  async getLeaves(personnelId: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id: personnelId, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    return this.prisma.leaveRecord.findMany({
      where: { personnelId, restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLeaveStatus(
    personnelId: string,
    leaveId: string,
    restaurantId: string,
    dto: UpdateLeaveStatusDto,
  ) {
    const leave = await this.prisma.leaveRecord.findFirst({
      where: { id: leaveId, personnelId, restaurantId },
    });

    if (!leave) {
      throw new NotFoundException('Izin kaydi bulunamadi');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Sadece bekleyen izinler guncellenebilir');
    }

    return this.prisma.leaveRecord.update({
      where: { id: leaveId },
      data: { status: dto.status },
    });
  }

  // --- Work Days Tracking ---

  async getWorkDays(personnelId: string, restaurantId: string, month?: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id: personnelId, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    let startOfMonth: Date;
    let endOfMonth: Date;

    if (month) {
      const [year, m] = month.split('-').map(Number);
      startOfMonth = new Date(year, m - 1, 1);
      endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const approvedLeaves = await this.prisma.leaveRecord.findMany({
      where: {
        personnelId,
        status: 'APPROVED',
        OR: [
          {
            startDate: { lte: endOfMonth },
            endDate: { gte: startOfMonth },
          },
        ],
      },
    });

    let leaveDays = 0;
    for (const leave of approvedLeaves) {
      const leaveStart = leave.startDate > startOfMonth ? leave.startDate : startOfMonth;
      const leaveEnd = leave.endDate < endOfMonth ? leave.endDate : endOfMonth;
      const diffTime = leaveEnd.getTime() - leaveStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      leaveDays += diffDays;
    }

    const totalDaysInMonth = endOfMonth.getDate();

    let weekends = 0;
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) {
        weekends++;
      }
    }

    const businessDays = totalDaysInMonth - weekends;
    const workDays = Math.max(0, businessDays - leaveDays);

    return {
      personnelId,
      month: month || `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
      totalDaysInMonth,
      weekends,
      businessDays,
      leaveDays,
      workDays,
      approvedLeaves: approvedLeaves.map((l) => ({
        id: l.id,
        startDate: l.startDate,
        endDate: l.endDate,
        type: l.type,
      })),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/personnel/personnel.service.ts
git commit -m "feat(personnel): add PersonnelService with CRUD, leave management, and work days tracking"
```

---

## Chunk 3: Backend Personnel Controller and Module

### Task 3: Create PersonnelController

**Files:**
- Create: `backend/src/personnel/personnel.controller.ts`

- [ ] **Step 1: Write PersonnelController**

```typescript
// backend/src/personnel/personnel.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('personnel')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR)
export class PersonnelController {
  constructor(private personnelService: PersonnelService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreatePersonnelDto,
  ) {
    return this.personnelService.create(restaurantId, dto);
  }

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.personnelService.findAll(restaurantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.personnelService.findById(id, restaurantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdatePersonnelDto,
  ) {
    return this.personnelService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.personnelService.remove(id, restaurantId);
  }

  // --- Leave Endpoints ---

  @Post(':id/leaves')
  createLeave(
    @Param('id') personnelId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.personnelService.createLeave(personnelId, restaurantId, dto);
  }

  @Get(':id/leaves')
  getLeaves(
    @Param('id') personnelId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.personnelService.getLeaves(personnelId, restaurantId);
  }

  @Patch(':id/leaves/:leaveId')
  updateLeaveStatus(
    @Param('id') personnelId: string,
    @Param('leaveId') leaveId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateLeaveStatusDto,
  ) {
    return this.personnelService.updateLeaveStatus(personnelId, leaveId, restaurantId, dto);
  }

  // --- Work Days ---

  @Get(':id/work-days')
  getWorkDays(
    @Param('id') personnelId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('month') month?: string,
  ) {
    return this.personnelService.getWorkDays(personnelId, restaurantId, month);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/personnel/personnel.controller.ts
git commit -m "feat(personnel): add PersonnelController with CRUD, leave, and work-days endpoints"
```

---

### Task 4: Create PersonnelModule and register in AppModule

**Files:**
- Create: `backend/src/personnel/personnel.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write PersonnelModule**

```typescript
// backend/src/personnel/personnel.module.ts
import { Module } from '@nestjs/common';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';

@Module({
  controllers: [PersonnelController],
  providers: [PersonnelService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
```

- [ ] **Step 2: Update AppModule to include PersonnelModule**

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
import { PersonnelModule } from './personnel/personnel.module';

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
    PersonnelModule,
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
git add backend/src/personnel/personnel.module.ts backend/src/app.module.ts
git commit -m "feat(personnel): add PersonnelModule and register in AppModule"
```

---

## Chunk 4: Frontend — Translations and Personnel List Page

### Task 5: Update Turkish translations for personnel

**Files:**
- Modify: `frontend/messages/tr.json`

- [ ] **Step 1: Add personnel section to tr.json**

Add the following keys to the existing `frontend/messages/tr.json` (after the `"restaurant"` section):

```json
{
  "personnel": {
    "title": "Personel Yonetimi",
    "addNew": "Yeni Personel Ekle",
    "name": "Ad",
    "surname": "Soyad",
    "fullName": "Ad Soyad",
    "phone": "Telefon",
    "tcNo": "TC Kimlik No",
    "position": "Pozisyon",
    "startDate": "Baslangic Tarihi",
    "salary": "Maas",
    "status": "Durum",
    "active": "Aktif",
    "inactive": "Pasif",
    "actions": "Islemler",
    "detail": "Detay",
    "edit": "Duzenle",
    "deactivate": "Pasife Al",
    "noPersonnel": "Henuz personel kaydi yok.",
    "createSuccess": "Personel basariyla eklendi.",
    "updateSuccess": "Personel bilgileri guncellendi.",
    "deactivateSuccess": "Personel pasife alindi.",
    "leaves": {
      "title": "Izin Kayitlari",
      "addNew": "Yeni Izin Ekle",
      "startDate": "Baslangic",
      "endDate": "Bitis",
      "type": "Izin Turu",
      "status": "Durum",
      "notes": "Notlar",
      "approve": "Onayla",
      "reject": "Reddet",
      "noLeaves": "Henuz izin kaydi yok.",
      "createSuccess": "Izin talebi olusturuldu.",
      "updateSuccess": "Izin durumu guncellendi.",
      "types": {
        "ANNUAL": "Yillik Izin",
        "SICK": "Hastalik Izni",
        "OTHER": "Diger"
      },
      "statuses": {
        "PENDING": "Beklemede",
        "APPROVED": "Onaylandi",
        "REJECTED": "Reddedildi"
      }
    },
    "workDays": {
      "title": "Calisma Gunleri",
      "month": "Ay",
      "totalDays": "Toplam Gun",
      "weekends": "Hafta Sonu",
      "businessDays": "Is Gunu",
      "leaveDays": "Izinli Gun",
      "workDays": "Calisilan Gun"
    }
  }
}
```

Merge these keys into the existing JSON file. The full file after merge should contain `common`, `auth`, `dashboard`, `nav`, `admin`, `restaurant`, and `personnel` sections.

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/tr.json
git commit -m "feat(personnel): add Turkish translations for personnel module"
```

---

### Task 6: Create Personnel List page

**Files:**
- Create: `frontend/src/app/dashboard/personnel/page.tsx`

- [ ] **Step 1: Write personnel list page**

```tsx
// frontend/src/app/dashboard/personnel/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, UserX } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Personnel {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  position: string | null;
  startDate: string;
  salary: string;
  isActive: boolean;
  createdAt: string;
}

export default function PersonnelListPage() {
  const [search, setSearch] = useState('');
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ['personnel'],
    queryFn: async () => {
      const { data } = await api.get('/personnel');
      return data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/personnel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setDeactivateId(null);
    },
  });

  const filtered = personnel.filter((p) => {
    const fullName = `${p.name} ${p.surname}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      (p.position && p.position.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Number(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Personel Yonetimi</h1>
        <Link href="/dashboard/personnel/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Personel Ekle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Personel Listesi</CardTitle>
            <Input
              placeholder="Ara (ad, pozisyon, telefon)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search ? 'Aramanizla eslesen personel bulunamadi.' : 'Henuz personel kaydi yok.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Pozisyon</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Baslangic Tarihi</TableHead>
                    <TableHead>Maas</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Islemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name} {p.surname}
                      </TableCell>
                      <TableCell>{p.position || '\u2014'}</TableCell>
                      <TableCell>{p.phone || '\u2014'}</TableCell>
                      <TableCell>{formatDate(p.startDate)}</TableCell>
                      <TableCell>{formatCurrency(p.salary)}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? 'default' : 'secondary'}>
                          {p.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/personnel/${p.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {p.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivateId(p.id)}
                            >
                              <UserX className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personeli Pasife Al</DialogTitle>
            <DialogDescription>
              Bu personeli pasife almak istediginizden emin misiniz? Bu islem geri alinabilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateId(null)}>
              Iptal
            </Button>
            <Button
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
            >
              {deactivateMutation.isPending ? 'Islem yapiliyor...' : 'Pasife Al'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/personnel/page.tsx
git commit -m "feat(personnel): add personnel list page with search, table, and deactivate dialog"
```

---

## Chunk 5: Frontend — New Personnel Form

### Task 7: Create New Personnel page

**Files:**
- Create: `frontend/src/app/dashboard/personnel/new/page.tsx`

- [ ] **Step 1: Write new personnel page**

```tsx
// frontend/src/app/dashboard/personnel/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CreatePersonnelForm {
  name: string;
  surname: string;
  phone: string;
  tcNo: string;
  position: string;
  startDate: string;
  salary: string;
}

export default function NewPersonnelPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreatePersonnelForm>({
    name: '',
    surname: '',
    phone: '',
    tcNo: '',
    position: '',
    startDate: new Date().toISOString().split('T')[0],
    salary: '',
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePersonnelForm) => {
      const { data } = await api.post('/personnel', {
        name: payload.name,
        surname: payload.surname,
        phone: payload.phone || undefined,
        tcNo: payload.tcNo || undefined,
        position: payload.position || undefined,
        startDate: payload.startDate,
        salary: Number(payload.salary),
      });
      return data;
    },
    onSuccess: () => {
      router.push('/dashboard/personnel');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Personel eklenirken bir hata olustu');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.surname.trim()) {
      setError('Ad ve soyad alanlari zorunludur');
      return;
    }

    if (!form.salary || Number(form.salary) < 0) {
      setError('Gecerli bir maas giriniz');
      return;
    }

    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/personnel">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Yeni Personel Ekle</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Personel Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad *</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Soyad *</Label>
                <Input
                  id="surname"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tcNo">TC Kimlik No</Label>
                <Input
                  id="tcNo"
                  name="tcNo"
                  value={form.tcNo}
                  onChange={handleChange}
                  maxLength={11}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Pozisyon</Label>
              <Input
                id="position"
                name="position"
                value={form.position}
                onChange={handleChange}
                placeholder="Ornegin: Garson, Asci, Kasiyer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Baslangic Tarihi *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Maas (TL) *</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/personnel">
                <Button type="button" variant="outline">
                  Iptal
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
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
git add frontend/src/app/dashboard/personnel/new/
git commit -m "feat(personnel): add new personnel form page"
```

---

## Chunk 6: Frontend — Personnel Detail Page with Leave Management

### Task 8: Create Personnel Detail page

**Files:**
- Create: `frontend/src/app/dashboard/personnel/[id]/page.tsx`

- [ ] **Step 1: Write personnel detail page**

```tsx
// frontend/src/app/dashboard/personnel/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  Briefcase,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
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

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  type: 'ANNUAL' | 'SICK' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string | null;
  createdAt: string;
}

interface PersonnelDetail {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  tcNo: string | null;
  position: string | null;
  startDate: string;
  salary: string;
  isActive: boolean;
  createdAt: string;
  leaveRecords: LeaveRecord[];
}

interface WorkDaysData {
  personnelId: string;
  month: string;
  totalDaysInMonth: number;
  weekends: number;
  businessDays: number;
  leaveDays: number;
  workDays: number;
  approvedLeaves: {
    id: string;
    startDate: string;
    endDate: string;
    type: string;
  }[];
}

const leaveTypeMap = {
  ANNUAL: { label: 'Yillik Izin', variant: 'default' as const },
  SICK: { label: 'Hastalik Izni', variant: 'secondary' as const },
  OTHER: { label: 'Diger', variant: 'outline' as const },
};

const leaveStatusMap = {
  PENDING: { label: 'Beklemede', variant: 'secondary' as const },
  APPROVED: { label: 'Onaylandi', variant: 'default' as const },
  REJECTED: { label: 'Reddedildi', variant: 'destructive' as const },
};

export default function PersonnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    phone: '',
    tcNo: '',
    position: '',
    startDate: '',
    salary: '',
  });
  const [editError, setEditError] = useState('');

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'ANNUAL' as 'ANNUAL' | 'SICK' | 'OTHER',
    notes: '',
  });
  const [leaveError, setLeaveError] = useState('');

  const now = new Date();
  const [workDaysMonth, setWorkDaysMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );

  const { data: personnel, isLoading } = useQuery<PersonnelDetail>({
    queryKey: ['personnel', id],
    queryFn: async () => {
      const { data } = await api.get(`/personnel/${id}`);
      return data;
    },
  });

  const { data: workDays } = useQuery<WorkDaysData>({
    queryKey: ['personnel', id, 'work-days', workDaysMonth],
    queryFn: async () => {
      const { data } = await api.get(`/personnel/${id}/work-days`, {
        params: { month: workDaysMonth },
      });
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await api.patch(`/personnel/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', id] });
      setIsEditing(false);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.message || 'Guncelleme sirasinda bir hata olustu');
    },
  });

  const createLeaveMutation = useMutation({
    mutationFn: async (payload: typeof leaveForm) => {
      const { data } = await api.post(`/personnel/${id}/leaves`, {
        startDate: payload.startDate,
        endDate: payload.endDate,
        type: payload.type,
        notes: payload.notes || undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', id] });
      queryClient.invalidateQueries({ queryKey: ['personnel', id, 'work-days'] });
      setShowLeaveDialog(false);
      setLeaveForm({ startDate: '', endDate: '', type: 'ANNUAL', notes: '' });
      setLeaveError('');
    },
    onError: (err: any) => {
      setLeaveError(err.response?.data?.message || 'Izin olusturulurken bir hata olustu');
    },
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({
      leaveId,
      status,
    }: {
      leaveId: string;
      status: 'APPROVED' | 'REJECTED';
    }) => {
      const { data } = await api.patch(`/personnel/${id}/leaves/${leaveId}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel', id] });
      queryClient.invalidateQueries({ queryKey: ['personnel', id, 'work-days'] });
    },
  });

  const startEditing = () => {
    if (!personnel) return;
    setEditForm({
      name: personnel.name,
      surname: personnel.surname,
      phone: personnel.phone || '',
      tcNo: personnel.tcNo || '',
      position: personnel.position || '',
      startDate: new Date(personnel.startDate).toISOString().split('T')[0],
      salary: String(personnel.salary),
    });
    setIsEditing(true);
    setEditError('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    const payload: Record<string, any> = {};
    if (editForm.name !== personnel?.name) payload.name = editForm.name;
    if (editForm.surname !== personnel?.surname) payload.surname = editForm.surname;
    if (editForm.phone !== (personnel?.phone || ''))
      payload.phone = editForm.phone || undefined;
    if (editForm.tcNo !== (personnel?.tcNo || ''))
      payload.tcNo = editForm.tcNo || undefined;
    if (editForm.position !== (personnel?.position || ''))
      payload.position = editForm.position || undefined;
    if (
      editForm.startDate !==
      new Date(personnel?.startDate || '').toISOString().split('T')[0]
    )
      payload.startDate = editForm.startDate;
    if (editForm.salary !== String(personnel?.salary))
      payload.salary = Number(editForm.salary);

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(payload);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError('');

    if (!leaveForm.startDate || !leaveForm.endDate) {
      setLeaveError('Baslangic ve bitis tarihleri zorunludur');
      return;
    }

    createLeaveMutation.mutate(leaveForm);
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Number(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Personel bulunamadi.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/personnel">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {personnel.name} {personnel.surname}
        </h1>
        <Badge variant={personnel.isActive ? 'default' : 'secondary'}>
          {personnel.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personnel Info Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personel Bilgileri</CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Duzenle
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {editError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                      {editError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Ad</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-surname">Soyad</Label>
                      <Input
                        id="edit-surname"
                        value={editForm.surname}
                        onChange={(e) =>
                          setEditForm({ ...editForm, surname: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Telefon</Label>
                      <Input
                        id="edit-phone"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-tcNo">TC Kimlik No</Label>
                      <Input
                        id="edit-tcNo"
                        value={editForm.tcNo}
                        onChange={(e) =>
                          setEditForm({ ...editForm, tcNo: e.target.value })
                        }
                        maxLength={11}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-position">Pozisyon</Label>
                    <Input
                      id="edit-position"
                      value={editForm.position}
                      onChange={(e) =>
                        setEditForm({ ...editForm, position: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Baslangic Tarihi</Label>
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, startDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-salary">Maas (TL)</Label>
                      <Input
                        id="edit-salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.salary}
                        onChange={(e) =>
                          setEditForm({ ...editForm, salary: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Iptal
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Ad</p>
                    <p className="font-medium">{personnel.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Soyad</p>
                    <p className="font-medium">{personnel.surname}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefon</p>
                    <p className="font-medium">{personnel.phone || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">TC Kimlik No</p>
                    <p className="font-medium">{personnel.tcNo || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pozisyon</p>
                    <p className="font-medium">{personnel.position || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Baslangic Tarihi</p>
                    <p className="font-medium">{formatDate(personnel.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Maas</p>
                    <p className="font-medium">{formatCurrency(personnel.salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kayit Tarihi</p>
                    <p className="font-medium">{formatDate(personnel.createdAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Work Days Card */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Calisma Gunleri</CardTitle>
              </div>
              <Input
                type="month"
                value={workDaysMonth}
                onChange={(e) => setWorkDaysMonth(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              {workDays ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Toplam Gun</span>
                    <span className="font-medium">{workDays.totalDaysInMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Hafta Sonu</span>
                    <span className="font-medium">{workDays.weekends}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Is Gunu</span>
                    <span className="font-medium">{workDays.businessDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Izinli Gun</span>
                    <span className="font-medium text-orange-600">
                      {workDays.leaveDays}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Calisilan Gun</span>
                      <span className="font-bold text-green-600">
                        {workDays.workDays}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Yukleniyor...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Records Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Izin Kayitlari</CardTitle>
          </div>
          <Button size="sm" onClick={() => setShowLeaveDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Izin Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {personnel.leaveRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henuz izin kaydi yok.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baslangic</TableHead>
                    <TableHead>Bitis</TableHead>
                    <TableHead>Izin Turu</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Notlar</TableHead>
                    <TableHead>Islemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnel.leaveRecords.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{formatDate(leave.startDate)}</TableCell>
                      <TableCell>{formatDate(leave.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant={leaveTypeMap[leave.type].variant}>
                          {leaveTypeMap[leave.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={leaveStatusMap[leave.status].variant}>
                          {leaveStatusMap[leave.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {leave.notes || '\u2014'}
                      </TableCell>
                      <TableCell>
                        {leave.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateLeaveStatusMutation.isPending}
                              onClick={() =>
                                updateLeaveStatusMutation.mutate({
                                  leaveId: leave.id,
                                  status: 'APPROVED',
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateLeaveStatusMutation.isPending}
                              onClick={() =>
                                updateLeaveStatusMutation.mutate({
                                  leaveId: leave.id,
                                  status: 'REJECTED',
                                })
                              }
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Leave Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Izin Talebi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            {leaveError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {leaveError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave-startDate">Baslangic Tarihi</Label>
                <Input
                  id="leave-startDate"
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-endDate">Bitis Tarihi</Label>
                <Input
                  id="leave-endDate"
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-type">Izin Turu</Label>
              <Select
                value={leaveForm.type}
                onValueChange={(value) =>
                  setLeaveForm({
                    ...leaveForm,
                    type: value as 'ANNUAL' | 'SICK' | 'OTHER',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Izin turu seciniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Yillik Izin</SelectItem>
                  <SelectItem value="SICK">Hastalik Izni</SelectItem>
                  <SelectItem value="OTHER">Diger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-notes">Notlar (opsiyonel)</Label>
              <Input
                id="leave-notes"
                value={leaveForm.notes}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, notes: e.target.value })
                }
                placeholder="Izin hakkinda not ekleyebilirsiniz"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLeaveDialog(false)}
              >
                Iptal
              </Button>
              <Button type="submit" disabled={createLeaveMutation.isPending}>
                {createLeaveMutation.isPending ? 'Olusturuluyor...' : 'Olustur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/personnel/\[id\]/
git commit -m "feat(personnel): add personnel detail page with edit, leave management, and work days"
```

---

## Chunk 7: Frontend — Select Component + Build Verification

### Task 9: Add shadcn/ui Select component (if not already added)

**Files:**
- Possibly create: shadcn/ui `select` component

- [ ] **Step 1: Add Select component from shadcn/ui**

The personnel detail page uses the `Select` component. If it was not already added in Plan 1, add it now:

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npx shadcn@latest add select
```

If it already exists, this step is a no-op.

- [ ] **Step 2: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify backend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit (if select component was added)**

```bash
git add frontend/src/components/ui/select.tsx
git commit -m "feat(personnel): add shadcn Select component for leave type picker"
```

---

### Task 10: Final verification and commit

- [ ] **Step 1: Verify both projects build cleanly**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend && npm run build
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend && npm run build
```
Expected: Both builds succeed with no errors

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat(personnel): complete Personnel (HR) module — backend API and frontend pages"
```

---

## Summary

This plan implements the complete Personnel (HR) module:

**Backend (NestJS):**
- `backend/src/personnel/dto/create-personnel.dto.ts` — validated DTO for creating personnel
- `backend/src/personnel/dto/update-personnel.dto.ts` — validated DTO for updating personnel (all fields optional)
- `backend/src/personnel/dto/create-leave.dto.ts` — validated DTO for creating leave requests
- `backend/src/personnel/dto/update-leave-status.dto.ts` — validated DTO for approving/rejecting leaves
- `backend/src/personnel/personnel.service.ts` — full business logic: personnel CRUD, leave creation with overlap detection, leave status management, work days calculation (business days minus approved leave days)
- `backend/src/personnel/personnel.controller.ts` — REST endpoints protected by JwtAuthGuard, RestaurantGuard, RolesGuard with ADMIN and HR role access
- `backend/src/personnel/personnel.module.ts` — NestJS module registered in AppModule

**API Endpoints:**
- `POST   /api/personnel` — create personnel
- `GET    /api/personnel` — list all personnel for restaurant
- `GET    /api/personnel/:id` — get personnel detail with leave records
- `PATCH  /api/personnel/:id` — update personnel
- `DELETE /api/personnel/:id` — soft-delete (set isActive=false)
- `POST   /api/personnel/:id/leaves` — create leave request
- `GET    /api/personnel/:id/leaves` — list leave records
- `PATCH  /api/personnel/:id/leaves/:leaveId` — approve/reject leave
- `GET    /api/personnel/:id/work-days?month=YYYY-MM` — calculate work days for month

**Frontend (Next.js):**
- `frontend/src/app/dashboard/personnel/page.tsx` — personnel list with search, table, status badges, deactivate dialog
- `frontend/src/app/dashboard/personnel/new/page.tsx` — new personnel form with validation
- `frontend/src/app/dashboard/personnel/[id]/page.tsx` — personnel detail with inline edit, leave records table (approve/reject), leave creation dialog, work days summary card with month picker
- `frontend/messages/tr.json` — Turkish translations for personnel section

**Security:** All endpoints require JWT authentication and ADMIN or HR role. Restaurant tenant isolation enforced via RestaurantGuard and restaurantId filtering in all queries.

**Next plans to implement:**
- Plan 3: Finance Module (Gelir/Gider + Dagitim)
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module
- Plan 6: Reporting Module
