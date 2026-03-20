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
    return <div className="p-6 text-[#70787d]">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 md:px-8 md:pb-12 space-y-10">
      {/* Page Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-[#70787d] mb-2">
            <span>Panel</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#004253] font-bold">Ürünler</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#004253] font-headline">Ürünler</h1>
          <p className="text-[#40484c] mt-1">Restoran menüsü ve ara ürün envanterini buradan yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-5 py-2.5 rounded-xl bg-[#f2f4f5] text-[#40484c] font-semibold text-sm hover:bg-[#e6e8e9] transition-colors flex items-center gap-2"
            onClick={() => router.push('/dashboard/products/categories')}
          >
            <span className="material-symbols-outlined text-lg">category</span>
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
            <span className="material-symbols-outlined text-lg">reorder</span>
            Stok Kaleminden Ürün Oluştur
          </button>
          <button
            className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-[#004253] to-[#005b71] text-white font-bold text-sm shadow-lg shadow-[#004253]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            onClick={() => router.push('/dashboard/products/new')}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Yeni Ürün
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#70787d] text-xl">search</span>
        <input
          placeholder="Ara (ad, kod, kategori)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 bg-[#f2f4f5] border-none rounded-full w-72 focus:ring-2 focus:ring-[#004253]/20 text-sm outline-none"
        />
      </div>

      {/* Main Sections */}
      <div className="space-y-8">
        {/* Section: Menü Ürünleri */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-8 bg-[#004253] rounded-full"></span>
              <h2 className="text-2xl font-bold tracking-tight text-[#191c1d] font-headline">Menü Ürünleri</h2>
              <span className="text-sm text-[#70787d]">({menuProducts.length})</span>
            </div>
            <button className="text-sm font-semibold text-[#004253] hover:underline">Tümünü Gör</button>
          </div>
          <div className="overflow-hidden bg-[#f2f4f5] rounded-xl">
            <table className="w-full text-left border-separate border-spacing-y-1">
              <thead>
                <tr className="bg-[#e6e8e9] text-[#70787d] text-[11px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4 rounded-tl-xl">Ürün Adı</th>
                  <th className="px-4 py-4">Kod</th>
                  <th className="px-4 py-4">Kategori</th>
                  <th className="px-4 py-4 text-right">Satış Fiyatı</th>
                  <th className="px-4 py-4 text-right">Maliyet</th>
                  <th className="px-4 py-4 text-center">Kar Marjı</th>
                  <th className="px-4 py-4">Tip</th>
                  <th className="px-6 py-4 text-center rounded-tr-xl">İşlemler</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {menuProducts.map((product, idx) => {
                  const productType = getProductType(product);
                  const margin = product.profitMargin != null && Number(product.price) > 0 ? Number(product.profitMargin) : null;

                  return (
                    <tr key={product.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f2f4f5]'} hover:bg-slate-50 transition-colors group`}>
                      <td className="px-6 py-4 font-semibold text-[#004253]">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                              <img alt={product.name} className="w-full h-full object-cover" src={product.image} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#005b71] font-extrabold text-sm shrink-0">
                              {getInitials(product.name)}
                            </div>
                          )}
                          {product.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-[#bfc8cc]">{product.code || '-'}</td>
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
                      <td className="px-4 py-4 text-center">
                        {margin != null ? (
                          <span className="px-2 py-1 bg-[#7df4ff]/30 text-[#004f54] rounded-lg text-xs font-extrabold">
                            %{formatPercent(margin)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-3 py-1 bg-[#e6e8e9] text-[#191c1d] rounded-full text-[10px] font-medium uppercase tracking-tight">{productType.label}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-[#004253]/10 text-[#004253] rounded-lg transition-colors" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button className="p-2 hover:bg-[#ffdad6] text-[#ba1a1a] rounded-lg transition-colors" onClick={() => { if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id); }}>
                            <span className="material-symbols-outlined text-lg">delete</span>
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
        </section>

        {/* Section: Ara Ürünler (Card Grid Layout) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-8 bg-[#516164] rounded-full"></span>
              <h2 className="text-2xl font-bold tracking-tight text-[#191c1d] font-headline">Ara Ürünler</h2>
              <span className="text-sm text-[#70787d]">({intermediateProducts.length})</span>
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
                  className="bg-white p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow flex items-center justify-between group border-l-4 border-transparent hover:border-[#004253] cursor-pointer"
                  onClick={() => router.push(`/dashboard/products/${product.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-[#005b71] font-extrabold text-xl shrink-0">
                      {getInitials(product.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#191c1d]">{product.name}</h4>
                      <p className="text-xs text-[#70787d] font-mono">{product.code || '-'}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {product.category?.name && (
                          <span className="text-[10px] bg-[#e6e8e9] px-2 py-0.5 rounded text-[#40484c] font-medium">{product.category.name}</span>
                        )}
                        {costValue != null && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isHighCost ? 'bg-[#ffdad6]/40 text-[#ba1a1a]' : 'bg-[#7df4ff]/20 text-[#004f54]'}`}>
                            Maliyet: {formatCurrency(costValue)} TL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#70787d] uppercase tracking-wider">İçerik</p>
                      <p className="text-lg font-black text-[#004253] font-headline">{ingredientCount}</p>
                    </div>
                    <button
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#004253]/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/products/${product.id}`);
                      }}
                      title="Düzenle"
                    >
                      <span className="material-symbols-outlined text-lg text-[#004253]">edit</span>
                    </button>
                    <button
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#ffdad6] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) deleteMutation.mutate(product.id);
                      }}
                      title="Sil"
                    >
                      <span className="material-symbols-outlined text-lg text-[#ba1a1a]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Hızlı Ara Ürün Ekle */}
            <button
              className="border-2 border-dashed border-[#bfc8cc]/50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-[#eceeef] hover:border-[#004253] transition-all group min-h-[96px]"
              onClick={() => router.push('/dashboard/products/new')}
            >
              <span className="material-symbols-outlined text-[#70787d] group-hover:text-[#004253] transition-colors text-3xl">add_circle</span>
              <span className="text-sm font-bold text-[#70787d] group-hover:text-[#004253] transition-colors">Hızlı Ara Ürün Ekle</span>
            </button>
          </div>

          {intermediateProducts.length === 0 && (
            <p className="text-center text-[#70787d] py-4">Henüz ara ürün bulunamadı</p>
          )}
        </section>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 pt-4">
        <p className="text-xs text-[#70787d] font-medium">Toplam {products.length} ürün</p>
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
