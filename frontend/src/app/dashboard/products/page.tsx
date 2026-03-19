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
    return <div className="p-6 text-[#70787d]">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-[#70787d] mb-2">
            <span>Panel</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#004253] font-bold">Ürünler</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#004253] font-[family-name:var(--font-headline)]">Ürünler</h1>
          <p className="text-[#40484c] mt-1">Restoran menüsü ve ara ürün envanterini buradan yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-5 py-2.5 rounded-xl bg-[#f2f4f5] text-[#40484c] font-semibold text-sm hover:bg-[#e6e8e9] transition-colors flex items-center gap-2"
            onClick={() => router.push('/dashboard/products/categories')}
          >
            <Tags className="h-4 w-4" />
            Kategoriler
          </button>
          <button
            className="px-5 py-2.5 rounded-xl bg-[#d4e6e9] text-[#57676a] font-semibold text-sm hover:brightness-95 transition-all flex items-center gap-2"
            onClick={() => {
              setSelectedRawMaterialId('');
              setDirectSalePrice('');
              setDirectSaleDialogOpen(true);
            }}
          >
            <Package className="h-4 w-4" />
            Stok Kaleminden Ürün Oluştur
          </button>
          <button
            className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-[#004253] to-[#005b71] text-white font-bold text-sm shadow-lg shadow-[#004253]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            onClick={() => router.push('/dashboard/products/new')}
          >
            <Plus className="h-4 w-4" />
            Yeni Ürün
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#70787d]" />
        <input
          placeholder="Ara (ad, kod, kategori)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 bg-[#f2f4f5] border-none rounded-full w-72 focus:ring-2 focus:ring-[#004253]/20 text-sm outline-none"
        />
      </div>

      {/* Menü Ürünleri */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-8 bg-[#004253] rounded-full"></span>
          <h2 className="text-2xl font-bold tracking-tight text-[#191c1d] font-[family-name:var(--font-headline)]">Menü Ürünleri</h2>
          <span className="text-sm text-[#70787d]">({menuProducts.length})</span>
        </div>
        <div className="overflow-hidden bg-[#f2f4f5] rounded-xl">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-[#e6e8e9] text-[#70787d] text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4 rounded-l-xl">Ürün Adı</th>
                <th className="px-4 py-4">Kod</th>
                <th className="px-4 py-4">Kategori</th>
                <th className="px-4 py-4 text-right">Satış Fiyatı</th>
                <th className="px-4 py-4 text-right">Maliyet</th>
                <th className="px-4 py-4 text-right">Kar Marjı</th>
                <th className="px-4 py-4 text-center">Tip</th>
                <th className="px-4 py-4 text-right rounded-r-xl">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {menuProducts.map((product, idx) => {
                const productType = getProductType(product);
                const margin = product.profitMargin != null && Number(product.price) > 0 ? Number(product.profitMargin) : null;

                return (
                  <tr key={product.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f4f5]'} hover:bg-slate-50 transition-colors group`}>
                    <td className="px-6 py-4 font-semibold text-[#004253]">{product.name}</td>
                    <td className="px-4 py-4 text-[#70787d]">{product.code || '-'}</td>
                    <td className="px-4 py-4">
                      {product.category?.name ? (
                        <span className="px-3 py-1 bg-[#d4e6e9] text-[#57676a] rounded-full text-[11px] font-bold">{product.category.name}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-[#191c1d]">
                      {Number(product.price) > 0
                        ? `${formatCurrency(Number(product.price))} TL`
                        : <span className="text-[#70787d]">-</span>}
                    </td>
                    <td className="px-4 py-4 text-right text-[#70787d]">
                      {product.calculatedCost != null && Number(product.calculatedCost) > 0
                        ? `${formatCurrency(Number(product.calculatedCost))} TL`
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {margin != null ? (
                        <span className="px-2 py-1 bg-[#7df4ff]/30 text-[#004f54] rounded-lg text-xs font-extrabold">
                          %{formatPercent(margin)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-[#e6e8e9] text-[#191c1d] rounded-full text-[10px] font-medium uppercase tracking-tight">{productType.label}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-lg hover:bg-[#e6e8e9] transition-colors" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                          <Eye className="h-4 w-4 text-[#40484c]" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-red-50 transition-colors" onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {menuProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-[#70787d] py-8">
                    Henüz menü ürünü bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ara Ürünler */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-8 bg-[#004253] rounded-full"></span>
          <h2 className="text-2xl font-bold tracking-tight text-[#191c1d] font-[family-name:var(--font-headline)]">Ara Ürünler</h2>
          <span className="text-sm text-[#70787d]">({intermediateProducts.length})</span>
        </div>
        <div className="overflow-hidden bg-[#f2f4f5] rounded-xl">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-[#e6e8e9] text-[#70787d] text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4 rounded-l-xl">Ürün Adı</th>
                <th className="px-4 py-4">Kod</th>
                <th className="px-4 py-4">Kategori</th>
                <th className="px-4 py-4 text-right">Maliyet</th>
                <th className="px-4 py-4 text-center">Tip</th>
                <th className="px-4 py-4 text-right rounded-r-xl">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {intermediateProducts.map((product, idx) => {
                const productType = getProductType(product);

                return (
                  <tr key={product.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f4f5]'} hover:bg-slate-50 transition-colors group`}>
                    <td className="px-6 py-4 font-semibold text-[#004253]">{product.name}</td>
                    <td className="px-4 py-4 text-[#70787d]">{product.code || '-'}</td>
                    <td className="px-4 py-4">
                      {product.category?.name ? (
                        <span className="px-3 py-1 bg-[#d4e6e9] text-[#57676a] rounded-full text-[11px] font-bold">{product.category.name}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 text-right text-[#70787d]">
                      {product.calculatedCost != null && Number(product.calculatedCost) > 0
                        ? `${formatCurrency(Number(product.calculatedCost))} TL`
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-[#e6e8e9] text-[#191c1d] rounded-full text-[10px] font-medium uppercase tracking-tight">{productType.label}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-lg hover:bg-[#e6e8e9] transition-colors" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                          <Eye className="h-4 w-4 text-[#40484c]" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-red-50 transition-colors" onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {intermediateProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#70787d] py-8">
                    Henüz ara ürün bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
