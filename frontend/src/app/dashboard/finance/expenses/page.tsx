'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseCategory {
  id: string;
  name: string;
}

type PeriodType = 'SAME_MONTH' | 'DIFFERENT_MONTH' | 'MULTI_MONTH';

interface ExpenseForm {
  title: string;
  amount: string;
  category: string;
  paymentDate: string;
  periodType: PeriodType;
  effectiveMonth: string;
  effectiveEndMonth: string;
}

const currentMonth = new Date().toISOString().slice(0, 7);

const emptyForm: ExpenseForm = {
  title: '',
  amount: '',
  category: '',
  paymentDate: new Date().toISOString().split('T')[0],
  periodType: 'SAME_MONTH',
  effectiveMonth: currentMonth,
  effectiveEndMonth: currentMonth,
};

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // ─── Kategoriler ───
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/expense-categories').then((r) => r.data),
  });

  const createCatMutation = useMutation({
    mutationFn: (name: string) => api.post('/expense-categories', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setCatName('');
      toast.success('Kategori eklendi');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Hata'),
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/expense-categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setEditingCatId(null);
      setEditingCatName('');
      toast.success('Kategori guncellendi');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Hata'),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expense-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Kategori silindi');
    },
    onError: () => toast.error('Kategori silinemedi'),
  });

  // ─── Giderler ───
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterCategory],
    queryFn: async () => {
      const params: any = {};
      if (filterCategory !== 'ALL') params.category = filterCategory;
      const { data } = await api.get('/expenses', { params });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/expenses', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddOpen(false);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gider eklenemedi'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await api.patch(`/expenses/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gider guncellenemedi'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError('Kategori secmelisiniz'); return; }
    const payload: any = {
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      paymentDate: form.paymentDate,
    };
    if (form.periodType === 'DIFFERENT_MONTH') payload.effectiveMonth = form.effectiveMonth;
    else if (form.periodType === 'MULTI_MONTH') {
      payload.effectiveMonth = form.effectiveMonth;
      payload.effectiveEndMonth = form.effectiveEndMonth;
    }
    createMutation.mutate(payload);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        paymentDate: form.paymentDate,
      },
    });
  };

  const handleEdit = (expense: any) => {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      paymentDate: new Date(expense.paymentDate).toISOString().split('T')[0],
      periodType: expense.effectiveEndMonth ? 'MULTI_MONTH' : expense.effectiveMonth ? 'DIFFERENT_MONTH' : 'SAME_MONTH',
      effectiveMonth: expense.effectiveMonth || currentMonth,
      effectiveEndMonth: expense.effectiveEndMonth || currentMonth,
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu gideri silmek istediginize emin misiniz?'))
      deleteMutation.mutate(id);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR');

  // ─── Kategori seçici (ortak) ───
  const categorySelect = (id: string) => (
    <select
      id={id}
      className={selectClass}
      value={form.category}
      onChange={(e) => setForm({ ...form, category: e.target.value })}
      required
    >
      <option value="">Kategori secin...</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.name}>{cat.name}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Giderler</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCatOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Kategoriler
          </Button>
          <Button onClick={() => { setForm({ ...emptyForm, category: categories[0]?.name || '' }); setError(''); setIsAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Gider Ekle
          </Button>
        </div>
      </div>

      {/* ─── Kategori Yönetim Dialog ─── */}
      <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gider Kategorileri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (catName.trim()) createCatMutation.mutate(catName.trim());
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Yeni kategori adi"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
              <Button type="submit" disabled={createCatMutation.isPending || !catName.trim()}>
                Ekle
              </Button>
            </form>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henuz kategori eklenmemis
                </p>
              )}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50">
                  {editingCatId === cat.id ? (
                    <>
                      <Input
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setEditingCatId(null); setEditingCatName(''); }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          if (editingCatName.trim())
                            updateCatMutation.mutate({ id: cat.id, name: editingCatName.trim() });
                        }}
                        disabled={updateCatMutation.isPending}
                      >
                        Kaydet
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => { setEditingCatId(null); setEditingCatName(''); }}
                      >
                        Iptal
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          if (confirm(`"${cat.name}" kategorisini silmek istediginize emin misiniz?`))
                            deleteCatMutation.mutate(cat.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Yeni Gider Dialog ─── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Gider</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="title">Baslik</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (TL)</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              {categorySelect('category')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Odeme Tarihi</Label>
              <Input id="paymentDate" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Ait Oldugu Donem</Label>
              <select className={selectClass} value={form.periodType} onChange={(e) => setForm({ ...form, periodType: e.target.value as PeriodType })}>
                <option value="SAME_MONTH">Ayni Ay (odeme tarihi)</option>
                <option value="DIFFERENT_MONTH">Farkli Ay</option>
                <option value="MULTI_MONTH">Birden Fazla Ay</option>
              </select>
            </div>
            {form.periodType === 'DIFFERENT_MONTH' && (
              <div className="space-y-2">
                <Label>Hangi Ay?</Label>
                <Input type="month" value={form.effectiveMonth} onChange={(e) => setForm({ ...form, effectiveMonth: e.target.value })} required />
              </div>
            )}
            {form.periodType === 'MULTI_MONTH' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Baslangic Ayi</Label>
                  <Input type="month" value={form.effectiveMonth} onChange={(e) => setForm({ ...form, effectiveMonth: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Bitis Ayi</Label>
                  <Input type="month" value={form.effectiveEndMonth} onChange={(e) => setForm({ ...form, effectiveEndMonth: e.target.value })} required />
                </div>
                {form.amount && form.effectiveMonth && form.effectiveEndMonth && form.effectiveEndMonth >= form.effectiveMonth && (
                  <div className="col-span-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                    {(() => {
                      const [sy, sm] = form.effectiveMonth.split('-').map(Number);
                      const [ey, em] = form.effectiveEndMonth.split('-').map(Number);
                      const count = (ey - sy) * 12 + (em - sm) + 1;
                      const perMonth = parseFloat(form.amount) / count;
                      return `${count} aya esit dagitim: ${perMonth.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL/ay`;
                    })()}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Iptal</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Gider Düzenle Dialog ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gider Duzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Baslik</Label>
              <Input id="edit-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Tutar (TL)</Label>
              <Input id="edit-amount" type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori</Label>
              {categorySelect('edit-category')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paymentDate">Odeme Tarihi</Label>
              <Input id="edit-paymentDate" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Iptal</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Filtre ─── */}
      <div className="flex items-center gap-3">
        <Label>Kategori Filtresi:</Label>
        <select
          className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="ALL">Tumu</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* ─── Tablo ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gider Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-center py-8">Yukleniyor...</p>
          ) : expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Henuz gider kaydi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Baslik</th>
                    <th className="text-left py-2 px-3 font-medium">Kategori</th>
                    <th className="text-right py-2 px-3 font-medium">Tutar</th>
                    <th className="text-left py-2 px-3 font-medium">Odeme Tarihi</th>
                    <th className="text-center py-2 px-3 font-medium">Donem</th>
                    <th className="text-right py-2 px-3 font-medium">Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: any) => (
                    <tr key={expense.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3">{expense.title}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">{expense.category}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="py-2 px-3">{formatDate(expense.paymentDate)}</td>
                      <td className="py-2 px-3 text-center">
                        {expense.effectiveMonth && !expense.effectiveEndMonth ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {formatMonth(expense.effectiveMonth)}
                          </Badge>
                        ) : expense.effectiveMonth && expense.effectiveEndMonth ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {formatMonth(expense.effectiveMonth)} - {formatMonth(expense.effectiveEndMonth)}
                          </Badge>
                        ) : expense.isDistributed ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {expense.distributionType === 'EQUAL'
                              ? `Esit (${expense.distributionMonths} ay)`
                              : expense.distributionType === 'REVENUE_BASED'
                              ? `Ciro Bazli (${expense.distributionMonths} ay)`
                              : 'Dagitildi'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Ayni Ay</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                            disabled={expense.isDistributed}
                            title={expense.isDistributed ? 'Dagitimi iptal etmeden duzenlenemez' : 'Duzenle'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
