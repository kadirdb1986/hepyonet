'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
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
import { ArrowLeft, Pencil, Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

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
  subProduct: { id: string; name: string; price: number } | null;
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
  category: string | null;
  calculatedCost?: number;
  profitMargin?: number;
  ingredients: Ingredient[];
}

interface CostBreakdown {
  productId: string;
  productName: string;
  price: number;
  totalCost: number;
  profitMargin: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    type: string;
  }[];
}

const UNITS = ['KG', 'GR', 'LT', 'ML', 'ADET'] as const;

export default function ProductDetailPage() {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const ti = useTranslations('inventory');
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
    quantity: 0,
    unit: 'KG',
  });
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    image: '',
    price: 0,
    category: '',
    isMenuItem: false,
    isComposite: false,
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
        ...data,
        code: data.code || undefined,
        description: data.description || undefined,
        image: data.image || undefined,
        category: data.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditing(false);
      toast.success(tc('save') + ' - OK');
    },
    onError: () => {
      toast.error('Hata olustu');
    },
  });

  const addIngredientMutation = useMutation({
    mutationFn: (data: { rawMaterialId?: string; subProductId?: string; quantity: number; unit: string }) =>
      api.post(`/products/${productId}/ingredients`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIngredientDialogOpen(false);
      resetIngredientForm();
      toast.success(tc('save') + ' - OK');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Hata olustu');
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) =>
      api.delete(`/products/${productId}/ingredients/${ingredientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(tc('delete') + ' - OK');
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
      category: product.category || '',
      isMenuItem: product.isMenuItem,
      isComposite: product.isComposite,
    });
    setEditing(true);
  }

  function resetIngredientForm() {
    setIngredientForm({ rawMaterialId: '', subProductId: '', quantity: 0, unit: 'KG' });
    setIngredientType('raw');
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault();
    const data: { rawMaterialId?: string; subProductId?: string; quantity: number; unit: string } = {
      quantity: ingredientForm.quantity,
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
    return <div className="p-6">{tc('loading')}</div>;
  }

  const otherProducts = allProducts.filter((p) => p.id !== productId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t('productDetail')}</h1>
      </div>

      {/* Product info card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{product.name}</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {tc('edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
              <div>
                <Label>{t('name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('code')}</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('category')}</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('description')}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('price')} (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isMenuItem}
                    onChange={(e) => setForm({ ...form, isMenuItem: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t('isMenuItem')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isComposite}
                    onChange={(e) => setForm({ ...form, isComposite: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t('isComposite')}</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {tc('save')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('code')}</p>
                <p className="font-medium">{product.code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('category')}</p>
                <p className="font-medium">{product.category || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('price')}</p>
                <p className="font-medium">{Number(product.price).toFixed(2)} TL</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('cost')}</p>
                <p className="font-medium">
                  {product.calculatedCost != null
                    ? `${Number(product.calculatedCost).toFixed(2)} TL`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profitMargin')}</p>
                <p className="font-medium">
                  {product.profitMargin != null
                    ? `%${Number(product.profitMargin).toFixed(1)}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('description')}</p>
                <p className="font-medium">{product.description || '-'}</p>
              </div>
              <div className="flex gap-2">
                {product.isMenuItem && <Badge variant="secondary">{t('isMenuItem')}</Badge>}
                {product.isComposite && <Badge variant="outline">{t('isComposite')}</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingredients / Recipe */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('ingredients')}</CardTitle>
          <Dialog open={ingredientDialogOpen} onOpenChange={setIngredientDialogOpen}>
            <Button onClick={() => { resetIngredientForm(); setIngredientDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addIngredient')}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('addIngredient')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddIngredient} className="space-y-4">
                <div>
                  <Label>{t('selectType')}</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={ingredientType}
                    onChange={(e) => setIngredientType(e.target.value as 'raw' | 'sub')}
                  >
                    <option value="raw">{t('rawMaterial')}</option>
                    <option value="sub">{t('subProduct')}</option>
                  </select>
                </div>
                {ingredientType === 'raw' ? (
                  <div>
                    <Label>{t('selectMaterial')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={ingredientForm.rawMaterialId}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, rawMaterialId: e.target.value })}
                      required
                    >
                      <option value="">{t('selectMaterial')}</option>
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <Label>{t('selectProduct')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={ingredientForm.subProductId}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, subProductId: e.target.value })}
                      required
                    >
                      <option value="">{t('selectProduct')}</option>
                      {otherProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('quantity')}</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={ingredientForm.quantity}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('unit')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={ingredientForm.unit}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {ti(`units.${u}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIngredientDialogOpen(false)}>
                    {tc('cancel')}
                  </Button>
                  <Button type="submit" disabled={addIngredientMutation.isPending}>
                    {tc('save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="text-center">{t('selectType')}</TableHead>
                <TableHead className="text-right">{t('quantity')}</TableHead>
                <TableHead>{t('unit')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.ingredients.map((ing) => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">
                    {ing.rawMaterial?.name || ing.subProduct?.name || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={ing.rawMaterialId ? 'secondary' : 'outline'}>
                      {ing.rawMaterialId ? t('rawMaterial') : t('subProduct')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(ing.quantity).toFixed(3)}
                  </TableCell>
                  <TableCell>{ing.unit}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(tc('confirm') + '?')) {
                          deleteIngredientMutation.mutate(ing.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {product.ingredients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('noIngredients')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost breakdown */}
      {costBreakdown && costBreakdown.ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('costBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead>{t('unit')}</TableHead>
                  <TableHead className="text-right">{t('unitCost')}</TableHead>
                  <TableHead className="text-right">{t('ingredientCost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costBreakdown.ingredients.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity).toFixed(3)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{Number(item.unitCost).toFixed(2)} TL</TableCell>
                    <TableCell className="text-right">{Number(item.totalCost).toFixed(2)} TL</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={4} className="text-right">{t('totalCost')}</TableCell>
                  <TableCell className="text-right">{Number(costBreakdown.totalCost).toFixed(2)} TL</TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell colSpan={4} className="text-right">{t('price')}</TableCell>
                  <TableCell className="text-right">{Number(costBreakdown.price).toFixed(2)} TL</TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell colSpan={4} className="text-right">{t('profitMargin')}</TableCell>
                  <TableCell className="text-right">%{Number(costBreakdown.profitMargin).toFixed(1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
