'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { handleNumericInput, displayNumericValue, parseNumericValue } from '@/lib/utils';

export default function NewProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    image: '',
    price: '' as string | number,
    categoryId: '',
    isMenuItem: false,
  });

  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/products', {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        image: data.image || undefined,
        price: parseNumericValue(data.price),
        categoryId: data.categoryId || undefined,
        isMenuItem: data.isMenuItem,
        isComposite: false,
      }),
    onSuccess: (res) => {
      toast.success('Ürün başarıyla oluşturuldu');
      router.push(`/dashboard/products/${res.data.id}`);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Ürün oluşturulurken hata oluştu');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }
    if (form.isMenuItem && parseNumericValue(form.price) <= 0) {
      toast.error('Menüde gösterilen ürünler için satış fiyatı zorunludur');
      return;
    }
    createMutation.mutate(form);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni Ürün Oluştur</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ürün Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <Label>
                Ürün Adı <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örnek: Köfte, Lahmacun, vb."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kod</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Örnek: URN-001"
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
                placeholder="Ürün hakkında kısa bir açıklama..."
              />
            </div>

            <div>
              <Label>Görsel URL</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
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
                <span className="text-sm font-medium">Menüde Göster</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {form.isMenuItem
                  ? 'Bu ürün menüde görünecek ve satış fiyatı zorunludur.'
                  : 'Bu ürün bir ara ürün olarak kullanılabilir (örneğin köfte, sos gibi).'}

              </p>
            </div>

            {form.isMenuItem ? (
              <div>
                <Label>
                  Satış Fiyatı (TL) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={displayNumericValue(form.price)}
                  onChange={(e) => setForm({ ...form, price: handleNumericInput(e.target.value) })}
                  placeholder="Örnek: 150,00"
                  required
                />
              </div>
            ) : (
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

            <div className="flex gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/products')}>
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
