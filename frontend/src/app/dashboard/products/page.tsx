'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2, Search, Package, Tags } from 'lucide-react';
import { toast } from 'sonner';

interface Ingredient {
  id: string;
  rawMaterialId: string | null;
  subProductId: string | null;
  quantity: number;
  unit: string;
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
  categoryId: string | null;
  category: { id: string; name: string } | null;
  calculatedCost?: number;
  profitMargin?: number;
  ingredients?: Ingredient[];
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  lastPurchasePrice: number;
}

/** Para formatla: her zaman 2 küsürat, Türkiye formatı (1.000,00) */
function formatCurrency(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Yüzde formatla: virgülle, 1 küsürat */
function formatPercent(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function getProductType(product: Product): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  const ingredients = product.ingredients || [];

  if (ingredients.length === 0) {
    return { label: 'Direkt Satis', variant: 'outline' };
  }

  const hasSubProduct = ingredients.some((i) => i.subProductId != null);
  const hasRawMaterial = ingredients.some((i) => i.rawMaterialId != null);

  if (hasSubProduct) {
    return { label: 'Kompozit', variant: 'destructive' };
  }

  if (hasRawMaterial && ingredients.length === 1 && ingredients[0].unit === 'ADET' && Number(ingredients[0].quantity) === 1) {
    return { label: 'Direkt Satis', variant: 'outline' };
  }

  if (hasRawMaterial) {
    return { label: 'Receteli', variant: 'default' };
  }

  return { label: 'Direkt Satis', variant: 'outline' };
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [directSaleDialogOpen, setDirectSaleDialogOpen] = useState(false);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');
  const [directSalePrice, setDirectSalePrice] = useState<number | string>('');

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Urun basariyla silindi');
    },
    onError: () => {
      toast.error('Urun silinirken hata olustu');
    },
  });

  const createDirectSaleMutation = useMutation({
    mutationFn: async () => {
      const rm = rawMaterials.find((m) => m.id === selectedRawMaterialId);
      if (!rm) throw new Error('Ham madde bulunamadi');

      const res = await api.post('/products', {
        name: rm.name,
        price: directSalePrice === '' ? 0 : directSalePrice,
        isMenuItem: true,
        isComposite: false,
      });

      await api.post(`/products/${res.data.id}/ingredients`, {
        rawMaterialId: rm.id,
        quantity: 1,
        unit: 'ADET',
      });

      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDirectSaleDialogOpen(false);
      setSelectedRawMaterialId('');
      setDirectSalePrice('');
      toast.success('Direkt satis urunu olusturuldu');
      router.push(`/dashboard/products/${data.id}`);
    },
    onError: () => {
      toast.error('Urun olusturulurken hata olustu');
    },
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
      (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  const menuProducts = filtered.filter((p) => p.isMenuItem);
  const intermediateProducts = filtered.filter((p) => !p.isMenuItem);

  function handleDirectSaleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRawMaterialId) {
      toast.error('Lutfen bir ham madde secin');
      return;
    }
    if (directSalePrice === '' || Number(directSalePrice) <= 0) {
      toast.error('Lutfen gecerli bir satis fiyati girin');
      return;
    }
    createDirectSaleMutation.mutate();
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Yukleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Urunler</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/products/categories')}
          >
            <Tags className="mr-2 h-4 w-4" />
            Kategoriler
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedRawMaterialId('');
              setDirectSalePrice('');
              setDirectSaleDialogOpen(true);
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            Ham Maddeden Urun Olustur
          </Button>
          <Button onClick={() => router.push('/dashboard/products/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Urun
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ara (ad, kod, kategori)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Menu Urunleri */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Urunleri ({menuProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urun Adi</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Satis Fiyati</TableHead>
                <TableHead className="text-right">Maliyet</TableHead>
                <TableHead className="text-right">Kar Marji</TableHead>
                <TableHead className="text-center">Tip</TableHead>
                <TableHead className="text-right">Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuProducts.map((product) => {
                const productType = getProductType(product);
                const margin = product.profitMargin != null && Number(product.price) > 0 ? Number(product.profitMargin) : null;

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.code || '-'}</TableCell>
                    <TableCell>{product.category?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {Number(product.price) > 0
                        ? `${formatCurrency(Number(product.price))} TL`
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.calculatedCost != null && Number(product.calculatedCost) > 0
                        ? `${formatCurrency(Number(product.calculatedCost))} TL`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {margin != null ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            margin >= 50
                              ? 'bg-green-100 text-green-800'
                              : margin >= 30
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          %{formatPercent(margin)}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={productType.variant}>{productType.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Bu urunu silmek istediginize emin misiniz?')) deleteMutation.mutate(product.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {menuProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Henuz menu urunu bulunamadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ara Urunler */}
      <Card>
        <CardHeader>
          <CardTitle>Ara Urunler ({intermediateProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urun Adi</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Maliyet</TableHead>
                <TableHead className="text-center">Tip</TableHead>
                <TableHead className="text-right">Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intermediateProducts.map((product) => {
                const productType = getProductType(product);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.code || '-'}</TableCell>
                    <TableCell>{product.category?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {product.calculatedCost != null && Number(product.calculatedCost) > 0
                        ? `${formatCurrency(Number(product.calculatedCost))} TL`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={productType.variant}>{productType.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Bu urunu silmek istediginize emin misiniz?')) deleteMutation.mutate(product.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {intermediateProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Henuz ara urun bulunamadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ham Maddeden Direkt Satis Urunu Olusturma Dialogu */}
      <Dialog open={directSaleDialogOpen} onOpenChange={setDirectSaleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ham Maddeden Urun Olustur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sectiginiz ham madde, 1 ADET olarak urunun icerigi haline gelir. Ornegin &quot;Sise Kola&quot; ham maddesini secip satis fiyati belirleyebilirsiniz.
          </p>
          <form onSubmit={handleDirectSaleSubmit} className="space-y-4">
            <div>
              <Label>Ham Madde</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedRawMaterialId}
                onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                required
              >
                <option value="">Ham madde secin...</option>
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit}) - {formatCurrency(Number(m.lastPurchasePrice))} TL
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Satis Fiyati (TL)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={directSalePrice || ''}
                onChange={(e) => setDirectSalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="Ornek: 25.00"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDirectSaleDialogOpen(false)}>
                Iptal
              </Button>
              <Button type="submit" disabled={createDirectSaleMutation.isPending}>
                {createDirectSaleMutation.isPending ? 'Olusturuluyor...' : 'Olustur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
