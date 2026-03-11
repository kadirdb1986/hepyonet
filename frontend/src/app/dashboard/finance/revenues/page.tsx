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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

interface RevenueForm {
  date: string;
  amount: string;
  notes: string;
}

const emptyForm: RevenueForm = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  notes: '',
};

export default function RevenuesPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RevenueForm>(emptyForm);
  const [error, setError] = useState('');

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues', selectedMonth],
    queryFn: async () => {
      const { data } = await api.get('/revenues', {
        params: { month: selectedMonth },
      });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/revenues', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setIsAddOpen(false);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ciro eklenemedi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/revenues/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setIsEditOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ciro guncellenemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/revenues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      date: form.date,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        date: form.date,
        amount: parseFloat(form.amount),
        notes: form.notes || undefined,
      },
    });
  };

  const handleEdit = (revenue: any) => {
    setEditingId(revenue.id);
    setForm({
      date: new Date(revenue.date).toISOString().split('T')[0],
      amount: String(revenue.amount),
      notes: revenue.notes || '',
    });
    setError('');
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu ciro kaydini silmek istediginize emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const totalRevenue = revenues.reduce(
    (sum: number, r: any) => sum + Number(r.amount),
    0,
  );

  const chartData = revenues
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    .map((r: any) => ({
      date: new Date(r.date).getDate().toString().padStart(2, '0'),
      amount: Number(r.amount),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gunluk Ciro Girisi</h1>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger
              render={
                <Button
                  className="gap-2"
                  onClick={() => {
                    setForm(emptyForm);
                    setError('');
                  }}
                />
              }
            >
              <Plus className="h-4 w-4" />
              Ciro Ekle
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gunluk Ciro Girisi</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="date">Tarih</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Ciro Tutari (TL)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Iptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ciro Duzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-date">Tarih</Label>
              <Input
                id="edit-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Ciro Tutari (TL)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notlar (Opsiyonel)</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Iptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Aylik Toplam Ciro
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {revenues.length} gun ciro girisi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Gunluk Ortalama
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {revenues.length > 0
                ? formatCurrency(totalRevenue / revenues.length)
                : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gunluk Ciro Grafigi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    'Ciro',
                  ]}
                />
                <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ciro Kayitlari</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 text-center py-8">Yukleniyor...</p>
          ) : revenues.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Bu ay icin ciro kaydi yok
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Tarih</th>
                    <th className="text-right py-2 px-3 font-medium">Tutar</th>
                    <th className="text-left py-2 px-3 font-medium">Notlar</th>
                    <th className="text-left py-2 px-3 font-medium">Kaynak</th>
                    <th className="text-right py-2 px-3 font-medium">Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map((revenue: any) => (
                    <tr
                      key={revenue.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3">
                        {formatDate(revenue.date)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(Number(revenue.amount))}
                      </td>
                      <td className="py-2 px-3 text-gray-600 max-w-xs truncate">
                        {revenue.notes || '-'}
                      </td>
                      <td className="py-2 px-3">
                        {revenue.source === 'MANUAL' ? 'Manuel' : 'API'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(revenue)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(revenue.id)}
                          >
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
