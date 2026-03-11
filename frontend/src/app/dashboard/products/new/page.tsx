'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProductPage() {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const router = useRouter();

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

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/products', {
        ...data,
        code: data.code || undefined,
        description: data.description || undefined,
        image: data.image || undefined,
        category: data.category || undefined,
      }),
    onSuccess: (res) => {
      toast.success(tc('save') + ' - OK');
      router.push(`/dashboard/products/${res.data.id}`);
    },
    onError: () => {
      toast.error('Hata olustu');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t('addProduct')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('addProduct')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
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
              <Label>{t('image')} (URL)</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
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
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {tc('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
