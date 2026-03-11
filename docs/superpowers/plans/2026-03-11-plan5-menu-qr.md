# Plan 5: Menu + QR Menu Module

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the menu management dashboard (list, reorder, toggle availability) and the public QR menu page. Restaurant admins and menu managers can manage which products appear on the menu, reorder them, and generate QR codes. Customers can scan QR codes to view a beautiful, mobile-first public menu page with no authentication required.

**Architecture:** Backend provides authenticated endpoints for menu management and a public endpoint for the QR menu. Frontend has two areas: dashboard pages for menu management/QR generation (authenticated, shadcn/ui), and a public menu page at `/m/:slug` (no auth, pure Tailwind CSS, SSR for performance and SEO).

**Tech Stack:** NestJS, Next.js, Prisma, Tailwind CSS, shadcn/ui (dashboard only), TanStack Query, `qrcode` npm package

**Spec:** `docs/superpowers/specs/2026-03-11-hepyonet-design.md`

**Depends on:**
- Plan 1: Foundation (auth, guards, Prisma, restaurant, user modules)
- Plan 4: Inventory + Product/Recipe Module (Product model, products endpoints)

**Related Plans:**
- Plan 1: Foundation
- Plan 2: Personnel (HR) Module
- Plan 3: Finance Module
- Plan 4: Inventory + Product/Recipe Module
- Plan 6: Reporting Module

---

## File Structure

```
hepyonet/
├── backend/
│   └── src/
│       └── menu/
│           ├── menu.module.ts
│           ├── menu.controller.ts
│           ├── menu.service.ts
│           └── dto/
│               ├── update-menu-order.dto.ts
│               └── toggle-availability.dto.ts
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── dashboard/
│   │       │   └── menu/
│   │       │       ├── page.tsx
│   │       │       └── qr/
│   │       │           └── page.tsx
│   │       └── m/
│   │           └── [slug]/
│   │               └── page.tsx
│   └── package.json
└── (existing files from Plans 1-4)
```

---

## Chunk 1: Backend — Menu Module

### Task 1: Install qrcode package

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install qrcode and its types in the frontend**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm install qrcode @types/qrcode
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add qrcode package for QR code generation"
```

---

### Task 2: Create Menu DTOs

**Files:**
- Create: `backend/src/menu/dto/update-menu-order.dto.ts`
- Create: `backend/src/menu/dto/toggle-availability.dto.ts`

- [ ] **Step 1: Create UpdateMenuOrderDto**

```typescript
// backend/src/menu/dto/update-menu-order.dto.ts
import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class MenuOrderItem {
  @IsString()
  menuItemId: string;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class UpdateMenuOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuOrderItem)
  items: MenuOrderItem[];
}
```

- [ ] **Step 2: Create ToggleAvailabilityDto**

```typescript
// backend/src/menu/dto/toggle-availability.dto.ts
import { IsBoolean } from 'class-validator';

export class ToggleAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/menu/dto/
git commit -m "feat: add Menu DTOs for order update and availability toggle"
```

---

### Task 3: Create MenuService

**Files:**
- Create: `backend/src/menu/menu.service.ts`

- [ ] **Step 1: Write MenuService**

```typescript
// backend/src/menu/menu.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuItems(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            image: true,
            price: true,
            category: true,
            isMenuItem: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async updateOrder(restaurantId: string, dto: UpdateMenuOrderDto) {
    const updates = dto.items.map((item) =>
      this.prisma.menuItem.updateMany({
        where: {
          id: item.menuItemId,
          restaurantId,
        },
        data: {
          displayOrder: item.displayOrder,
        },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.getMenuItems(restaurantId);
  }

  async toggleAvailability(
    restaurantId: string,
    productId: string,
    dto: ToggleAvailabilityDto,
  ) {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        productId,
        restaurantId,
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return this.prisma.menuItem.update({
      where: { id: menuItem.id },
      data: { isAvailable: dto.isAvailable },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            image: true,
            price: true,
            category: true,
            isMenuItem: true,
          },
        },
      },
    });
  }

  async getPublicMenu(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        address: true,
        phone: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        isAvailable: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            image: true,
            price: true,
            category: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Group menu items by category
    const categories: Record<string, typeof menuItems> = {};
    for (const item of menuItems) {
      const category = item.product.category || 'Diger';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    }

    return {
      restaurant,
      categories: Object.entries(categories).map(([name, items]) => ({
        name,
        items: items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          code: item.product.code,
          description: item.product.description,
          image: item.product.image,
          price: item.product.price,
        })),
      })),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/menu/menu.service.ts
git commit -m "feat: add MenuService with CRUD, reorder, toggle, and public menu"
```

---

### Task 4: Create MenuController

**Files:**
- Create: `backend/src/menu/menu.controller.ts`

- [ ] **Step 1: Write MenuController**

```typescript
// backend/src/menu/menu.controller.ts
import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  getMenuItems(@CurrentUser('restaurantId') restaurantId: string) {
    return this.menuService.getMenuItems(restaurantId);
  }

  @Patch('order')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  updateOrder(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateMenuOrderDto,
  ) {
    return this.menuService.updateOrder(restaurantId, dto);
  }

  @Patch(':productId/availability')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MENU_MANAGER)
  toggleAvailability(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('productId') productId: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.menuService.toggleAvailability(restaurantId, productId, dto);
  }

  @Get('public/:slug')
  getPublicMenu(@Param('slug') slug: string) {
    return this.menuService.getPublicMenu(slug);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/menu/menu.controller.ts
git commit -m "feat: add MenuController with authenticated and public endpoints"
```

---

### Task 5: Create MenuModule and register in AppModule

**Files:**
- Create: `backend/src/menu/menu.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write MenuModule**

```typescript
// backend/src/menu/menu.module.ts
import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
```

- [ ] **Step 2: Register MenuModule in AppModule**

Add the import and module registration to `backend/src/app.module.ts`:

```typescript
// backend/src/app.module.ts — add to existing imports
import { MenuModule } from './menu/menu.module';

// Add MenuModule to the imports array:
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
    // ... other modules from Plans 2-4 ...
    MenuModule,
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
git add backend/src/menu/menu.module.ts backend/src/app.module.ts
git commit -m "feat: add MenuModule and register in AppModule"
```

---

## Chunk 2: Frontend — Menu Management Dashboard

### Task 6: Add menu translations to tr.json

**Files:**
- Modify: `frontend/messages/tr.json`

- [ ] **Step 1: Add menu-related translations**

Add the following keys to the existing `frontend/messages/tr.json`:

```json
{
  "menu": {
    "title": "Menu Yonetimi",
    "description": "Menunuzdeki urunleri yonetin, siralayin ve musterilerinize gosterin.",
    "emptyState": "Henuz menude urun yok. Urunler sayfasindan urunleri menuye ekleyebilirsiniz.",
    "product": "Urun",
    "code": "Kod",
    "category": "Kategori",
    "price": "Fiyat",
    "order": "Sira",
    "availability": "Durum",
    "available": "Aktif",
    "unavailable": "Pasif",
    "moveUp": "Yukari",
    "moveDown": "Asagi",
    "saveOrder": "Siralamavi Kaydet",
    "orderSaved": "Siralama kaydedildi",
    "availabilityUpdated": "Urun durumu guncellendi",
    "qr": {
      "title": "QR Menu",
      "description": "QR kodu olusturun ve musterilerinizin menunuzu telefonlarindan goruntulemesini saglayin.",
      "menuUrl": "Menu Adresi",
      "downloadPng": "PNG Indir",
      "downloadSvg": "SVG Indir",
      "preview": "Menu Onizleme",
      "openInNewTab": "Yeni Sekmede Ac",
      "copyUrl": "Adresi Kopyala",
      "copied": "Kopyalandi!",
      "scanToView": "QR kodu tarayarak menunuzu goruntuleyebilirsiniz."
    }
  }
}
```

Merge these keys into the existing `tr.json` at the top level alongside `common`, `auth`, `dashboard`, `nav`, etc.

- [ ] **Step 2: Commit**

```bash
git add frontend/messages/tr.json
git commit -m "feat: add Turkish translations for menu and QR menu module"
```

---

### Task 7: Create menu management page

**Files:**
- Create: `frontend/src/app/dashboard/menu/page.tsx`

- [ ] **Step 1: Write menu management page**

```tsx
// frontend/src/app/dashboard/menu/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { ArrowUp, ArrowDown, QrCode, Save, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image: string | null;
  price: string;
  category: string | null;
  isMenuItem: boolean;
}

interface MenuItem {
  id: string;
  productId: string;
  restaurantId: string;
  displayOrder: number;
  isAvailable: boolean;
  product: Product;
}

export default function MenuManagementPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [orderedItems, setOrderedItems] = useState<MenuItem[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data } = await api.get('/menu');
      return data;
    },
  });

  useEffect(() => {
    if (menuItems) {
      setOrderedItems([...menuItems]);
      setHasOrderChanged(false);
    }
  }, [menuItems]);

  const updateOrderMutation = useMutation({
    mutationFn: async (items: { menuItemId: string; displayOrder: number }[]) => {
      const { data } = await api.patch('/menu/order', { items });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      setHasOrderChanged(false);
      toast({
        title: 'Basarili',
        description: 'Siralama kaydedildi',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Siralama kaydedilemedi',
        variant: 'destructive',
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) => {
      const { data } = await api.patch(`/menu/${productId}/availability`, { isAvailable });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast({
        title: 'Basarili',
        description: 'Urun durumu guncellendi',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Urun durumu guncellenemedi',
        variant: 'destructive',
      });
    },
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...orderedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

    // Update display orders
    newItems.forEach((item, i) => {
      item.displayOrder = i;
    });

    setOrderedItems(newItems);
    setHasOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const items = orderedItems.map((item, index) => ({
      menuItemId: item.id,
      displayOrder: index,
    }));
    updateOrderMutation.mutate(items);
  };

  const handleToggleAvailability = (productId: string, currentValue: boolean) => {
    toggleAvailabilityMutation.mutate({
      productId,
      isAvailable: !currentValue,
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(parseFloat(price));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Yonetimi</h1>
          <p className="text-gray-500 mt-1">
            Menunuzdeki urunleri yonetin, siralayin ve musterilerinize gosterin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasOrderChanged && (
            <Button
              onClick={handleSaveOrder}
              disabled={updateOrderMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateOrderMutation.isPending ? 'Kaydediliyor...' : 'Siralamavi Kaydet'}
            </Button>
          )}
          <Link href="/dashboard/menu/qr">
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />
              QR Menu
            </Button>
          </Link>
        </div>
      </div>

      {orderedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              Henuz menude urun yok. Urunler sayfasindan urunleri menuye ekleyebilirsiniz.
            </p>
            <Link href="/dashboard/products">
              <Button variant="outline" className="mt-4">
                Urunlere Git
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Menu Urunleri</CardTitle>
            <CardDescription>
              Toplam {orderedItems.length} urun menude gorunuyor. Siralama butonlariyla
              gorunum sirasini degistirebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Sira</TableHead>
                  <TableHead>Urun</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Fiyat</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="text-center w-[120px]">Sirala</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-gray-500">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                            <UtensilsCrossed className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          {item.product.description && (
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">
                              {item.product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.product.code ? (
                        <Badge variant="outline">{item.product.code}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.product.category ? (
                        <Badge variant="secondary">{item.product.category}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.product.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() =>
                            handleToggleAvailability(item.productId, item.isAvailable)
                          }
                          disabled={toggleAvailabilityMutation.isPending}
                        />
                        <span className="text-sm text-gray-500">
                          {item.isAvailable ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === orderedItems.length - 1}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Switch component from shadcn (if not already added)**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npx shadcn@latest add switch
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/menu/page.tsx frontend/src/components/ui/switch.tsx
git commit -m "feat: add menu management page with reorder and availability toggle"
```

---

### Task 8: Create QR code generation page

**Files:**
- Create: `frontend/src/app/dashboard/menu/qr/page.tsx`

- [ ] **Step 1: Write QR code generation page**

```tsx
// frontend/src/app/dashboard/menu/qr/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  QrCode,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QRMenuPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const slug = user?.restaurant?.slug || '';
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
  const menuUrl = `${frontendUrl}/m/${slug}`;

  useEffect(() => {
    if (!slug) return;

    // Generate PNG data URL
    QRCode.toDataURL(menuUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    }).then(setQrDataUrl);

    // Generate SVG string
    QRCode.toString(menuUrl, {
      type: 'svg',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    }).then(setQrSvg);
  }, [slug, menuUrl]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `${slug}-qr-menu.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleDownloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${slug}-qr-menu.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast({
        title: 'Kopyalandi!',
        description: 'Menu adresi panoya kopyalandi.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Hata',
        description: 'Adres kopyalanamadi.',
        variant: 'destructive',
      });
    }
  };

  if (!slug) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Restoran bilgisi bulunamadi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/menu">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">QR Menu</h1>
          <p className="text-gray-500 mt-1">
            QR kodu olusturun ve musterilerinizin menunuzu telefonlarindan goruntulemesini saglayin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Kod
            </CardTitle>
            <CardDescription>
              QR kodu tarayarak menunuzu goruntuleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {qrDataUrl ? (
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <img
                  src={qrDataUrl}
                  alt="QR Menu Code"
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                <p className="text-gray-400">Olusturuluyor...</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleDownloadPng} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PNG Indir
              </Button>
              <Button onClick={handleDownloadSvg} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                SVG Indir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* URL & Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Adresi</CardTitle>
            <CardDescription>
              Bu adresi musterilerinizle paylasabilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input value={menuUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-3">
              <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Yeni Sekmede Ac
                </Button>
              </a>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <p className="text-sm text-gray-500 font-mono truncate">{menuUrl}</p>
              </div>
              <div className="relative" style={{ paddingBottom: '150%' }}>
                <iframe
                  src={menuUrl}
                  className="absolute inset-0 w-full h-full"
                  title="Menu Onizleme"
                  style={{
                    transform: 'scale(0.75)',
                    transformOrigin: 'top left',
                    width: '133.33%',
                    height: '133.33%',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/menu/qr/page.tsx
git commit -m "feat: add QR code generation page with PNG/SVG download and preview"
```

---

## Chunk 3: Frontend — Public QR Menu Page

### Task 9: Create public menu page (SSR, no auth)

**Files:**
- Create: `frontend/src/app/m/[slug]/page.tsx`

- [ ] **Step 1: Write the public menu page**

This page uses Server-Side Rendering (SSR). It fetches data on the server and renders a beautiful, mobile-first menu page. No authentication is required. No shadcn/ui — pure Tailwind CSS for a lightweight public page.

```tsx
// frontend/src/app/m/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image: string | null;
  price: string;
}

interface Category {
  name: string;
  items: Product[];
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
}

interface PublicMenuData {
  restaurant: Restaurant;
  categories: Category[];
}

async function getMenuData(slug: string): Promise<PublicMenuData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${apiUrl}/menu/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMenuData(slug);
  if (!data) {
    return { title: 'Menu Bulunamadi' };
  }
  return {
    title: `${data.restaurant.name} - Menu`,
    description: `${data.restaurant.name} restoran menusu. Lezzetli yemeklerimizi inceleyin.`,
    openGraph: {
      title: `${data.restaurant.name} - Menu`,
      description: `${data.restaurant.name} restoran menusu`,
      ...(data.restaurant.logo ? { images: [data.restaurant.logo] } : {}),
    },
  };
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(parseFloat(price));
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getMenuData(slug);

  if (!data) {
    notFound();
  }

  const { restaurant, categories } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-amber-200 shadow-sm"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-white text-xl font-bold">
                  {restaurant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
              {restaurant.address && (
                <p className="text-sm text-gray-500">{restaurant.address}</p>
              )}
              {restaurant.phone && (
                <p className="text-sm text-gray-500">{restaurant.phone}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      {categories.length > 1 && (
        <nav className="bg-white border-b sticky top-[72px] z-10">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide gap-1 py-2">
              {categories.map((category) => (
                <a
                  key={category.name}
                  href={`#category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                    bg-amber-100 text-amber-800 hover:bg-amber-200
                    transition-colors whitespace-nowrap"
                >
                  {category.name}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Menu Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">Menu henuz hazirlanmamis.</p>
          </div>
        ) : (
          categories.map((category) => (
            <section
              key={category.name}
              id={`category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="scroll-mt-32"
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-300 to-transparent" />
                <h2 className="text-lg font-bold text-gray-800 px-2">
                  {category.name}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-amber-300 to-transparent" />
              </div>

              {/* Product Cards */}
              <div className="space-y-3">
                {category.items.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100
                      hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="flex">
                      {/* Product Info */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">
                              {product.name}
                            </h3>
                            {product.code && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs
                                font-mono bg-gray-100 text-gray-500 rounded">
                                {product.code}
                              </span>
                            )}
                          </div>
                        </div>
                        {product.description && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <p className="mt-3 text-lg font-bold text-amber-700">
                          {formatPrice(product.price)}
                        </p>
                      </div>

                      {/* Product Image */}
                      {product.image && (
                        <div className="flex-shrink-0 w-28 h-28 m-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-400">
            {restaurant.name} &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            HepYonet ile olusturuldu
          </p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Create not-found page for invalid slugs**

```tsx
// frontend/src/app/m/[slug]/not-found.tsx
export default function MenuNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
          <svg
            className="w-10 h-10 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Menu Bulunamadi
        </h1>
        <p className="text-gray-500 max-w-sm">
          Aradiginiz restoran menusu bulunamadi. Lutfen QR kodu tekrar tarayin
          veya restoran ile iletisime gecin.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add NEXT_PUBLIC_FRONTEND_URL to frontend/.env.example**

Add the following to `frontend/.env.example`:

```env
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds. The `/m/[slug]` page should be listed as an SSR route.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/m/ frontend/.env.example
git commit -m "feat: add public QR menu page with SSR, mobile-first responsive design"
```

---

## Chunk 4: Integration & Final Verification

### Task 10: Add scrollbar-hide utility to Tailwind config

**Files:**
- Modify: `frontend/tailwind.config.ts`

The public menu page uses `scrollbar-hide` for the horizontal category navigation. Add a simple plugin or utility for this.

- [ ] **Step 1: Install tailwind-scrollbar-hide plugin**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm install tailwind-scrollbar-hide
```

- [ ] **Step 2: Add plugin to tailwind.config.ts**

Add to the `plugins` array in `frontend/tailwind.config.ts`:

```typescript
// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';
import scrollbarHide from 'tailwind-scrollbar-hide';

const config: Config = {
  // ... existing config ...
  plugins: [
    // ... existing plugins ...
    scrollbarHide,
  ],
};

export default config;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add tailwind-scrollbar-hide plugin for horizontal scroll areas"
```

---

### Task 11: Final integration verification

- [ ] **Step 1: Verify backend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 3: End-to-end verification checklist**

Manually verify the following:

1. **Backend API:**
   - `GET /api/menu` — returns menu items (requires auth, ADMIN or MENU_MANAGER)
   - `PATCH /api/menu/order` — updates display order (requires auth, ADMIN or MENU_MANAGER)
   - `PATCH /api/menu/:productId/availability` — toggles availability (requires auth, ADMIN or MENU_MANAGER)
   - `GET /api/menu/public/:slug` — returns public menu data (no auth)

2. **Dashboard — Menu Management (`/dashboard/menu`):**
   - Shows list of menu items with product name, code, category, price
   - Up/down buttons reorder items; save button persists order
   - Switch toggles product availability
   - Link to QR Menu page

3. **Dashboard — QR Code (`/dashboard/menu/qr`):**
   - Displays generated QR code pointing to `/m/{restaurant-slug}`
   - PNG and SVG download buttons work
   - Copy URL button copies menu URL to clipboard
   - Inline iframe preview of public menu

4. **Public Menu (`/m/:slug`):**
   - Loads without authentication
   - SSR — fast initial load, SEO-friendly meta tags
   - Restaurant header with logo, name, address, phone
   - Horizontal category navigation tabs
   - Product cards with image, name, code, description, price
   - Mobile-optimized layout
   - 404 page for invalid slugs

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Menu + QR Menu module (Plan 5)"
```
