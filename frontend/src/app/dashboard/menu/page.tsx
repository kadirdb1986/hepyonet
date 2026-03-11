'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
      toast.error('Hata olustu');
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
      toast.error('Hata olustu');
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

  if (isLoading) {
    return <div className="p-6">{tc('loading')}</div>;
  }

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

      {orderedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-muted-foreground text-center">{t('emptyState')}</p>
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
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              Toplam {orderedItems.length} urun menude gorunuyor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t('order')}</TableHead>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead className="text-right">{t('price')}</TableHead>
                  <TableHead className="text-center">{t('availability')}</TableHead>
                  <TableHead className="text-center w-[120px]">{t('order')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-muted-foreground">
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
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
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
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.product.category ? (
                        <Badge variant="secondary">{item.product.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.product.price).toFixed(2)} TL
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
                        <span className="text-sm text-muted-foreground">
                          {item.isAvailable ? t('available') : t('unavailable')}
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
