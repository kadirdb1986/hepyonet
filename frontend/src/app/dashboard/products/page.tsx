'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

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
  calculatedCost?: number;
  profitMargin?: number;
}

export default function ProductsPage() {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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
    onError: () => {
      toast.error('Hata olustu');
    },
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={tc('search') + '...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
                <TableHead className="text-right">{t('price')}</TableHead>
                <TableHead className="text-right">{t('cost')}</TableHead>
                <TableHead className="text-right">{t('profitMargin')}</TableHead>
                <TableHead className="text-center">{t('isMenuItem')}</TableHead>
                <TableHead className="text-center">{t('isComposite')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="text-muted-foreground">
                    {product.code || '-'}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell className="text-right">
                    {Number(product.price).toFixed(2)} TL
                  </TableCell>
                  <TableCell className="text-right">
                    {product.calculatedCost != null
                      ? `${Number(product.calculatedCost).toFixed(2)} TL`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.profitMargin != null ? (
                      <Badge
                        variant={
                          Number(product.profitMargin) >= 50
                            ? 'default'
                            : Number(product.profitMargin) >= 30
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        %{Number(product.profitMargin).toFixed(1)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.isMenuItem && (
                      <Badge variant="secondary">{t('isMenuItem')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.isComposite && (
                      <Badge variant="outline">{t('isComposite')}</Badge>
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Henuz urun bulunamadi
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
