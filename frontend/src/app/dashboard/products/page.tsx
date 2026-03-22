'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ChevronRight,
  Tag,
  GripVertical,
  Plus,
  Search,
  Pencil,
  Trash2,
  PlusCircle,
} from 'lucide-react';

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

/** İsmin baş harflerini al (en fazla 2 harf) */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
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

  // Compute summary stats from unfiltered products
  const allMenuProducts = products.filter((p) => p.isMenuItem);
  const allIntermediateProducts = products.filter((p) => !p.isMenuItem);
  const lowMarginCount = allMenuProducts.filter(
    (p) => p.profitMargin != null && Number(p.price) > 0 && Number(p.profitMargin) < 30
  ).length;
  const activeSalesCount = allMenuProducts.filter((p) => Number(p.price) > 0).length;

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
    <div className="p-6 md:px-8 md:pb-12 space-y-10">
      {/* Page Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Panel</span>
            <ChevronRight className="size-4" />
            <span className="text-primary font-bold">Ürünler</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary font-headline">Ürünler</h1>
          <p className="text-muted-foreground mt-1">Restoran menüsü ve ara ürün envanterini buradan yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/dashboard/products/categories')}
          >
            <Tag className="size-5" />
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
            <GripVertical className="size-4" />
            Stok Kaleminden Ürün Oluştur
          </Button>
          <Button
            onClick={() => router.push('/dashboard/products/new')}
          >
            <Plus className="size-5" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Ara (ad, kod, kategori)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-full bg-muted border-none focus-visible:ring-primary/20"
        />
      </div>

      {/* Main Sections */}
      <div className="space-y-8">
        {/* Section: Menü Ürünleri */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full"></span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">Menü Ürünleri</h2>
              <span className="text-sm text-muted-foreground">({menuProducts.length})</span>
            </div>
            <button className="text-sm font-semibold text-primary hover:underline">Tümünü Gör</button>
          </div>
          <div className="overflow-hidden bg-muted rounded-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted text-muted-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-muted">
                  <TableHead className="px-6 py-4">Ürün Adı</TableHead>
                  <TableHead className="px-4 py-4">Kod</TableHead>
                  <TableHead className="px-4 py-4">Kategori</TableHead>
                  <TableHead className="px-4 py-4 text-right">Satış Fiyatı</TableHead>
                  <TableHead className="px-4 py-4 text-right">Maliyet</TableHead>
                  <TableHead className="px-4 py-4 text-center">Kar Marjı</TableHead>
                  <TableHead className="px-4 py-4">Tip</TableHead>
                  <TableHead className="px-6 py-4 text-center">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm">
                {menuProducts.map((product, idx) => {
                  const productType = getProductType(product);
                  const margin = product.profitMargin != null && Number(product.price) > 0 ? Number(product.profitMargin) : null;

                  return (
                    <TableRow key={product.id} className={`${idx % 2 === 0 ? 'bg-card' : 'bg-muted'} hover:bg-muted transition-colors group`}>
                      <TableCell className="px-6 py-4 font-semibold text-primary">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                              <img alt={product.name} className="w-full h-full object-cover" src={product.image} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary font-extrabold text-sm shrink-0">
                              {getInitials(product.name)}
                            </div>
                          )}
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 font-mono text-border">{product.code || '-'}</TableCell>
                      <TableCell className="px-4 py-4">
                        {product.category?.name ? (
                          <Badge variant="secondary">{product.category.name}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right font-bold text-foreground">
                        {Number(product.price) > 0
                          ? `${formatCurrency(Number(product.price))} TL`
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right text-muted-foreground">
                        {product.calculatedCost != null && Number(product.calculatedCost) > 0
                          ? `${formatCurrency(Number(product.calculatedCost))} TL`
                          : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        {margin != null ? (
                          <span className="px-2 py-1 bg-secondary/30 text-primary rounded-lg text-xs font-extrabold">
                            %{formatPercent(margin)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <span className="px-3 py-1 bg-muted text-foreground rounded-full text-[10px] font-medium uppercase tracking-tight">{productType.label}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-primary/10 text-primary"
                            onClick={() => router.push(`/dashboard/products/${product.id}`)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 text-destructive"
                            onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id); }}
                          >
                            <Trash2 className="size-4" />
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
          </div>
        </section>

        {/* Section: Ara Ürünler (Card Grid Layout) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-8 bg-muted-foreground/40 rounded-full"></span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">Ara Ürünler</h2>
              <span className="text-sm text-muted-foreground">({intermediateProducts.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {intermediateProducts.map((product) => {
              const ingredientCount = product.ingredients?.length ?? 0;
              const costValue = product.calculatedCost != null && Number(product.calculatedCost) > 0 ? Number(product.calculatedCost) : null;
              const isHighCost = costValue != null && costValue > 2000;

              return (
                <div
                  key={product.id}
                  className="bg-card p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow flex items-center justify-between group border-l-4 border-transparent hover:border-primary cursor-pointer"
                  onClick={() => router.push(`/dashboard/products/${product.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center text-primary font-extrabold text-xl shrink-0">
                      {getInitials(product.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{product.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{product.code || '-'}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {product.category?.name && (
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium">{product.category.name}</span>
                        )}
                        {costValue != null && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isHighCost ? 'bg-destructive/10 text-destructive' : 'bg-secondary/20 text-primary'}`}>
                            Maliyet: {formatCurrency(costValue)} TL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">İçerik</p>
                      <p className="text-lg font-black text-primary font-headline">{ingredientCount}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/products/${product.id}`);
                      }}
                      title="Düzenle"
                    >
                      <Pencil className="size-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id);
                      }}
                      title="Sil"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Hızlı Ara Ürün Ekle */}
            <button
              className="border-2 border-dashed border-border/50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-muted hover:border-primary transition-all group min-h-[96px]"
              onClick={() => router.push('/dashboard/products/new')}
            >
              <PlusCircle className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Hızlı Ara Ürün Ekle</span>
            </button>
          </div>

          {intermediateProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Henüz ara ürün bulunamadı</p>
          )}
        </section>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 pt-4">
        <p className="text-xs text-muted-foreground font-medium">Toplam {products.length} ürün</p>
      </div>

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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
