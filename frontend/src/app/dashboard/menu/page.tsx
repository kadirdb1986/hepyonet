'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { ArrowUp, ArrowDown, QrCode, Save, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image: string | null;
  price: string;
  category: { id: string; name: string } | null;
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
  const t = useTranslations('menu');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [orderedItems, setOrderedItems] = useState<MenuItem[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['menu-items'],
    queryFn: () => api.get('/menu').then((r) => r.data),
  });

  useEffect(() => {
    if (menuItems) {
      setOrderedItems([...menuItems]);
      setHasOrderChanged(false);
    }
  }, [menuItems]);

  const updateOrderMutation = useMutation({
    mutationFn: (items: { menuItemId: string; displayOrder: number }[]) =>
      api.patch('/menu/order', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      setHasOrderChanged(false);
      toast.success(t('orderSaved'));
    },
    onError: () => {
      toast.error('Hata oluştu');
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      api.patch(`/menu/${productId}/availability`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success(t('availabilityUpdated'));
    },
    onError: () => {
      toast.error('Hata oluştu');
    },
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...orderedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
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

  const columns: ColumnDef<MenuItem>[] = [
    {
      id: 'order',
      header: t('order'),
      cell: ({ row }) => (
        <span className="font-medium text-muted-foreground">{row.index + 1}</span>
      ),
    },
    {
      id: 'product',
      header: t('product'),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3">
            {item.product.image ? (
              <img
                src={item.product.image}
                alt={item.product.name}
                className="h-10 w-10 rounded-md object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{item.product.name}</p>
              {item.product.description && (
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {item.product.description}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'code',
      header: t('code'),
      cell: ({ row }) => {
        const code = row.original.product.code;
        return code ? (
          <Badge variant="outline">{code}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'category',
      header: t('category'),
      cell: ({ row }) => {
        const category = row.original.product.category;
        return category ? (
          <Badge variant="secondary">{category.name}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'price',
      header: () => <div className="text-right">{t('price')}</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {Number(row.original.product.price).toFixed(2)} TL
        </div>
      ),
    },
    {
      id: 'availability',
      header: () => <div className="text-center">{t('availability')}</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-center gap-2">
            <Switch
              checked={item.isAvailable}
              onCheckedChange={() => handleToggleAvailability(item.productId, item.isAvailable)}
              disabled={toggleAvailabilityMutation.isPending}
            />
            <span className="text-sm text-muted-foreground">
              {item.isAvailable ? t('available') : t('unavailable')}
            </span>
          </div>
        );
      },
    },
    {
      id: 'sort',
      header: () => <div className="text-center w-[120px]">{t('order')}</div>,
      cell: ({ row }) => {
        const index = row.index;
        return (
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
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          {hasOrderChanged && (
            <Button onClick={handleSaveOrder} disabled={updateOrderMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {t('saveOrder')}
            </Button>
          )}
          <Link href="/dashboard/menu/qr">
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />
              {t('qr.title')}
            </Button>
          </Link>
        </div>
      </div>

      {!isLoading && orderedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">{t('emptyState')}</p>
            <Link href="/dashboard/products">
              <Button variant="outline" className="mt-4">
                Ürünlere Git
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              Toplam {orderedItems.length} urun menude gorunuyor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={orderedItems}
              isLoading={isLoading}
              showPagination={false}
              showToolbar={false}
              emptyMessage={t('emptyState')}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
