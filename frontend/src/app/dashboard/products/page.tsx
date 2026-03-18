'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';
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
    return { label: 'Direkt Satış', variant: 'outline' };
  }

  const hasSubProduct = ingredients.some((i) => i.subProductId != null);
  const hasRawMaterial = ingredients.some((i) => i.rawMaterialId != null);

  if (hasSubProduct) {
    return { label: 'Kompozit', variant: 'destructive' };
  }

  if (hasRawMaterial && ingredients.length === 1 && ingredients[0].unit === 'ADET' && Number(ingredients[0].quantity) === 1) {
    return { label: 'Direkt Satış', variant: 'outline' };
  }

  if (hasRawMaterial) {
    return { label: 'Reçeteli', variant: 'default' };
  }

  return { label: 'Direkt Satış', variant: 'outline' };
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [directSaleDialogOpen, setDirectSaleDialogOpen] = useState(false);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');
  const [directSalePrice, setDirectSalePrice] = useState<string>('');

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
      toast.success('Ürün başarıyla silindi');
    },
    onError: () => {
      toast.error('Ürün silinirken hata oluştu');
    },
  });

  const createDirectSaleMutation = useMutation({
    mutationFn: async () => {
      const rm = rawMaterials.find((m) => m.id === selectedRawMaterialId);
      if (!rm) throw new Error('Ham madde bulunamadi');

      const res = await api.post('/products', {
        name: rm.name,
        price: parseNumericValue(directSalePrice),
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
      toast.success('Direkt satış ürünü oluşturuldu');
      router.push(`/dashboard/products/${data.id}`);
    },
    onError: () => {
      toast.error('Ürün oluşturulurken hata oluştu');
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
      toast.error('Lütfen bir stok kalemi seçin');
      return;
    }
    if (parseNumericValue(directSalePrice) <= 0) {
      toast.error('Lütfen geçerli bir satış fiyatı girin');
      return;
    }
    createDirectSaleMutation.mutate();
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ürünler</h1>
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
            Stok Kaleminden Ürün Oluştur
          </Button>
          <Button onClick={() => router.push('/dashboard/products/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ürün
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

      {/* Menü Ürünleri */}
      <Card>
        <CardHeader>
          <CardTitle>Menü Ürünleri ({menuProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Satış Fiyatı</TableHead>
                <TableHead className="text-right">Maliyet</TableHead>
                <TableHead className="text-right">Kar Marjı</TableHead>
                <TableHead className="text-center">Tip</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
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
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id); }}>
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
                    Henüz menü ürünü bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ara Ürünler */}
      <Card>
        <CardHeader>
          <CardTitle>Ara Ürünler ({intermediateProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Maliyet</TableHead>
                <TableHead className="text-center">Tip</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
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
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id); }}>
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
                    Henüz ara ürün bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stok Kaleminden Direkt Satış Ürünü Oluşturma Dialogu */}
      <Dialog open={directSaleDialogOpen} onOpenChange={setDirectSaleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Kaleminden Ürün Oluştur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Seçtiğiniz stok kalemi, 1 ADET olarak ürünün içeriği haline gelir. Örneğin &quot;Şişe Kola&quot; stok kalemini seçip satış fiyatı belirleyebilirsiniz.
          </p>
          <form onSubmit={handleDirectSaleSubmit} className="space-y-4">
            <div>
              <Label>Stok Kalemi</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedRawMaterialId}
                onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                required
              >
                <option value="">Stok kalemi seçin...</option>
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit}) - {formatCurrency(Number(m.lastPurchasePrice))} TL
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Satış Fiyatı (TL)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={displayNumericValue(directSalePrice)}
                onChange={(e) => setDirectSalePrice(handleNumericInput(e.target.value))}
                placeholder="Örnek: 25,00"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDirectSaleDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createDirectSaleMutation.isPending}>
                {createDirectSaleMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
