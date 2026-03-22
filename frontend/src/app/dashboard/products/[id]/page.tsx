'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ArrowLeft, Pencil, Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  lastPurchasePrice: number;
}

interface Ingredient {
  id: string;
  rawMaterialId: string | null;
  subProductId: string | null;
  quantity: number;
  unit: string;
  rawMaterial: { id: string; name: string; unit: string; lastPurchasePrice: number } | null;
  subProduct: { id: string; name: string; price: number; calculatedCost?: number } | null;
}

interface Category {
  id: string;
  name: string;
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
  category: Category | null;
  calculatedCost?: number;
  profitMargin?: number;
  ingredients: Ingredient[];
}

interface CostBreakdownIngredient {
  type: 'raw_material' | 'sub_product';
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  unitPrice?: number;
  baseUnit?: string;
  unitCost?: number;
}

interface CostBreakdown {
  productId: string;
  productName: string;
  price: number;
  totalCost: number;
  profitMargin: number;
  ingredients: CostBreakdownIngredient[];
}

const UNITS = ['KG', 'GR', 'LT', 'ML', 'ADET'] as const;

const UNIT_LABELS: Record<string, string> = {
  KG: 'Kilogram',
  GR: 'Gram',
  LT: 'Litre',
  ML: 'Mililitre',
  ADET: 'Adet',
};

/** Miktar formatla: tam sayıysa küsürat gösterme, varsa virgülle göster */
function formatQuantity(val: number): string {
  if (Number.isInteger(val)) return val.toLocaleString('tr-TR');
  return val.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
}

/** Para formatla: her zaman 2 küsürat, Türkiye formatı (1.000,00) */
function formatCurrency(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Yüzde formatla: virgülle, 1 küsürat */
function formatPercent(val: number): string {
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Birim dönüşümü: içerik biriminden ham madde baz birimine çevir */
function convertToBaseUnit(quantity: number, ingredientUnit: string, materialBaseUnit: string): number {
  const from = ingredientUnit.toUpperCase();
  const to = materialBaseUnit.toUpperCase();
  if (from === to) return quantity;
  if (from === 'GR' && to === 'KG') return quantity / 1000;
  if (from === 'KG' && to === 'GR') return quantity * 1000;
  if (from === 'ML' && to === 'LT') return quantity / 1000;
  if (from === 'LT' && to === 'ML') return quantity * 1000;
  return quantity;
}

/** Baz birim fiyatını içerik birimine çevir (ör: 700 TL/KG → 0,70 TL/GR) */
function getUnitCostInIngredientUnit(pricePerBaseUnit: number, ingredientUnit: string, materialBaseUnit: string): number {
  const from = ingredientUnit.toUpperCase();
  const to = materialBaseUnit.toUpperCase();
  if (from === to) return pricePerBaseUnit;
  if (from === 'GR' && to === 'KG') return pricePerBaseUnit / 1000;
  if (from === 'KG' && to === 'GR') return pricePerBaseUnit * 1000;
  if (from === 'ML' && to === 'LT') return pricePerBaseUnit / 1000;
  if (from === 'LT' && to === 'ML') return pricePerBaseUnit * 1000;
  return pricePerBaseUnit;
}

/** Uyumlu birimler: KG↔GR, LT↔ML, ADET yalnız */
const COMPATIBLE_UNITS: Record<string, string[]> = {
  KG: ['KG', 'GR'],
  GR: ['KG', 'GR'],
  LT: ['LT', 'ML'],
  ML: ['LT', 'ML'],
  ADET: ['ADET'],
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;

  const [editing, setEditing] = useState(false);
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [ingredientType, setIngredientType] = useState<'raw' | 'sub'>('raw');
  const [ingredientForm, setIngredientForm] = useState({
    rawMaterialId: '',
    subProductId: '',
    quantity: '' as string | number,
    unit: 'KG',
  });
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    image: '',
    price: '' as string | number,
    categoryId: '',
    isMenuItem: false,
  });

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['products', productId],
    queryFn: () => api.get(`/products/${productId}`).then((r) => r.data),
  });

  const { data: costBreakdown } = useQuery<CostBreakdown>({
    queryKey: ['products', productId, 'cost'],
    queryFn: () => api.get(`/products/${productId}/cost`).then((r) => r.data),
    enabled: !!product,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.patch(`/products/${productId}`, {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        image: data.image || undefined,
        price: parseNumericValue(data.price),
        categoryId: data.categoryId || undefined,
        isMenuItem: data.isMenuItem,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditing(false);
      toast.success('Ürün başarıyla güncellendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Güncelleme sırasında hata oluştu');
    },
  });

  const addIngredientMutation = useMutation({
    mutationFn: (data: { rawMaterialId?: string; subProductId?: string; quantity: number; unit: string }) =>
      api.post(`/products/${productId}/ingredients`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIngredientDialogOpen(false);
      resetIngredientForm();
      toast.success('İçerik başarıyla eklendi');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'İçerik eklenirken hata oluştu');
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) =>
      api.delete(`/products/${productId}/ingredients/${ingredientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('İçerik başarıyla silindi');
    },
    onError: () => {
      toast.error('İçerik silinirken hata oluştu');
    },
  });

  function startEdit() {
    if (!product) return;
    setForm({
      name: product.name,
      code: product.code || '',
      description: product.description || '',
      image: product.image || '',
      price: Number(product.price),
      categoryId: product.categoryId || '',
      isMenuItem: product.isMenuItem,
    });
    setEditing(true);
  }

  function resetIngredientForm() {
    setIngredientForm({ rawMaterialId: '', subProductId: '', quantity: '' as string | number, unit: 'KG' });
    setIngredientType('raw');
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault();
    const data: { rawMaterialId?: string; subProductId?: string; quantity: number; unit: string } = {
      quantity: parseNumericValue(ingredientForm.quantity),
      unit: ingredientForm.unit,
    };
    if (ingredientType === 'raw') {
      data.rawMaterialId = ingredientForm.rawMaterialId;
    } else {
      data.subProductId = ingredientForm.subProductId;
    }
    addIngredientMutation.mutate(data);
  }

  if (isLoading || !product) {
    return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  }

  const otherProducts = allProducts.filter((p) => p.id !== productId);
  const margin = costBreakdown ? Number(costBreakdown.profitMargin) : (product.profitMargin != null ? Number(product.profitMargin) : null);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Ürün Detayı</h1>
      </div>

      {/* Product Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{product.name}</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
              <div>
                <Label>Ürün Adı <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kod</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">Kategorisiz</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Görsel URL</Label>
                <Input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isMenuItem}
                    onChange={(e) => setForm({ ...form, isMenuItem: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Menüde Göster</span>
                </label>
              </div>
              {form.isMenuItem && (
                <div>
                  <Label>Satış Fiyatı (TL) <span className="text-destructive">*</span></Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={displayNumericValue(form.price)}
                    onChange={(e) => setForm({ ...form, price: handleNumericInput(e.target.value) })}
                    required
                  />
                </div>
              )}
              {!form.isMenuItem && (
                <div>
                  <Label>Satış Fiyatı (TL)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={displayNumericValue(form.price)}
                    onChange={(e) => setForm({ ...form, price: handleNumericInput(e.target.value) })}
                    placeholder="Opsiyonel - ara ürün ise boş bırakılabilir"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  İptal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kod</p>
                <p className="font-medium">{product.code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kategori</p>
                <p className="font-medium">{product.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Satış Fiyatı</p>
                <p className="font-medium">
                  {Number(product.price) > 0
                    ? `${formatCurrency(Number(product.price))} TL`
                    : <span className="text-muted-foreground">Belirlenmedi</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maliyet</p>
                <p className="font-medium">
                  {product.calculatedCost != null && Number(product.calculatedCost) > 0
                    ? `${formatCurrency(Number(product.calculatedCost))} TL`
                    : '-'}
                </p>
              </div>
              {Number(product.price) > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Kar Marjı</p>
                  <p className="font-medium">
                    {product.profitMargin != null ? (
                      <span
                        className={`${
                          Number(product.profitMargin) >= 50
                            ? 'text-green-600'
                            : Number(product.profitMargin) >= 30
                              ? 'text-yellow-600'
                              : 'text-destructive'
                        }`}
                      >
                        %{formatPercent(Number(product.profitMargin))}
                      </span>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Açıklama</p>
                <p className="font-medium">{product.description || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durum</p>
                <div className="flex gap-2 mt-1">
                  {product.isMenuItem && <Badge variant="secondary">Menü</Badge>}
                  {product.isComposite && <Badge variant="outline">Kompozit</Badge>}
                  {!product.isMenuItem && !product.isComposite && (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reçete / İçerikler */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reçete / İçerikler</CardTitle>
          <Button onClick={() => { resetIngredientForm(); setIngredientDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            İçerik Ekle
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead className="text-center">Tip</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead>Birim</TableHead>
                <TableHead className="text-right">Birim Maliyet</TableHead>
                <TableHead className="text-right">Toplam Maliyet</TableHead>
                <TableHead className="text-right">Sil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.ingredients.map((ing) => {
                const name = ing.rawMaterial?.name || ing.subProduct?.name || '-';
                const isRaw = ing.rawMaterialId != null;
                let unitCost: number;
                let totalCost: number;
                if (isRaw && ing.rawMaterial) {
                  const pricePerBaseUnit = Number(ing.rawMaterial.lastPurchasePrice);
                  unitCost = getUnitCostInIngredientUnit(pricePerBaseUnit, ing.unit, ing.rawMaterial.unit);
                  totalCost = unitCost * Number(ing.quantity);
                } else {
                  unitCost = Number(ing.subProduct?.calculatedCost ?? ing.subProduct?.price ?? 0);
                  totalCost = unitCost * Number(ing.quantity);
                }

                return (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isRaw ? 'secondary' : 'outline'}>
                        {isRaw ? 'Stok Kalemi' : 'Alt Ürün'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(Number(ing.quantity))}
                    </TableCell>
                    <TableCell>{UNIT_LABELS[ing.unit] || ing.unit}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(unitCost))} TL
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalCost)} TL
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Bu içeriği silmek istediğinize emin misiniz?')) {
                            deleteIngredientMutation.mutate(ing.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {product.ingredients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Henüz içerik eklenmemiş. &quot;İçerik Ekle&quot; butonunu kullanarak stok kalemi veya alt ürün ekleyebilirsiniz.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Özet */}
          {costBreakdown && costBreakdown.ingredients.length > 0 && (
            <div className="mt-6 border-t pt-4 space-y-3 max-w-sm ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Toplam Maliyet</span>
                <span className="font-semibold">{formatCurrency(Number(costBreakdown.totalCost))} TL</span>
              </div>
              {Number(costBreakdown.price) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Satış Fiyatı</span>
                    <span className="font-semibold">{formatCurrency(Number(costBreakdown.price))} TL</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Kar Marjı</span>
                    <span
                      className={`font-bold text-base ${
                        margin != null && margin >= 50
                          ? 'text-green-600'
                          : margin != null && margin >= 30
                            ? 'text-yellow-600'
                            : 'text-destructive'
                      }`}
                    >
                      %{formatPercent(Number(costBreakdown.profitMargin))}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* İçerik Ekleme Dialogu */}
      <Dialog open={ingredientDialogOpen} onOpenChange={setIngredientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>İçerik Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddIngredient} className="space-y-4">
            <div>
              <Label>İçerik Tipi</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={ingredientType}
                onChange={(e) => setIngredientType(e.target.value as 'raw' | 'sub')}
              >
                <option value="raw">Stok Kalemi</option>
                <option value="sub">Alt Ürün</option>
              </select>
            </div>

            {ingredientType === 'raw' ? (
              <div>
                <Label>Stok Kalemi Seç</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={ingredientForm.rawMaterialId}
                  onChange={(e) => {
                    const rmId = e.target.value;
                    const rm = rawMaterials.find((m) => m.id === rmId);
                    const compatible = rm ? (COMPATIBLE_UNITS[rm.unit.toUpperCase()] || [rm.unit]) : UNITS as unknown as string[];
                    const newUnit = rm && !compatible.includes(ingredientForm.unit) ? compatible[0] : ingredientForm.unit;
                    setIngredientForm({ ...ingredientForm, rawMaterialId: rmId, unit: newUnit });
                  }}
                  required
                >
                  <option value="">Stok kalemi seçin...</option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({UNIT_LABELS[m.unit] || m.unit}) - {formatCurrency(Number(m.lastPurchasePrice))} TL/{m.unit}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <Label>Alt Ürün Seç</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={ingredientForm.subProductId}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, subProductId: e.target.value })}
                  required
                >
                  <option value="">Ürün seçin...</option>
                  {otherProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.calculatedCost != null ? `- ${formatCurrency(Number(p.calculatedCost))} TL` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Miktar</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={displayNumericValue(ingredientForm.quantity)}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: handleNumericInput(e.target.value) })}
                  placeholder="Örnek: 200"
                  required
                />
              </div>
              <div>
                <Label>Birim</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={ingredientForm.unit}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                >
                  {(() => {
                    if (ingredientType === 'raw' && ingredientForm.rawMaterialId) {
                      const rm = rawMaterials.find((m) => m.id === ingredientForm.rawMaterialId);
                      const compatible = rm ? (COMPATIBLE_UNITS[rm.unit.toUpperCase()] || [rm.unit]) : (UNITS as unknown as string[]);
                      return compatible.map((u) => (
                        <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>
                      ));
                    }
                    return UNITS.map((u) => (
                      <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIngredientDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={addIngredientMutation.isPending}>
                {addIngredientMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
