'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

const formatCurrency = (amount: number) => {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
};

const dayNames = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];

export default function RevenuesPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues', selectedMonth],
    queryFn: async () => {
      const { data } = await api.get('/revenues', { params: { month: selectedMonth } });
      return data;
    },
  });

  // Build full month days with revenue data
  const monthDays = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const maxDay = isCurrentMonth ? now.getDate() : new Date(y, m, 0).getDate();
    const days = [];

    for (let day = 1; day <= maxDay; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(y, m - 1, day);
      const dayName = dayNames[dateObj.getDay()];

      // Find matching revenue
      const revenue = revenues.find((r: any) => {
        const rDate = new Date(r.date);
        return rDate.getFullYear() === y && rDate.getMonth() === m - 1 && rDate.getDate() === day;
      });

      days.push({
        day,
        dateStr,
        dayName,
        amount: revenue ? Number(revenue.amount) : 0,
        id: revenue?.id || null,
        notes: revenue?.notes || '',
        hasData: !!revenue,
      });
    }

    return days.reverse();
  }, [selectedMonth, revenues]);

  const totalRevenue = monthDays.reduce((sum, d) => sum + d.amount, 0);
  const daysWithRevenue = monthDays.filter((d) => d.hasData).length;

  const chartData = monthDays.map((d) => ({
    date: String(d.day),
    amount: d.amount,
  }));

  // Create or update revenue for a day
  const saveMutation = useMutation({
    mutationFn: async ({ day, amount }: { day: typeof monthDays[0]; amount: number }) => {
      if (day.id) {
        // Update existing
        await api.patch(`/revenues/${day.id}`, { amount });
      } else {
        // Create new
        await api.post('/revenues', { date: day.dateStr, amount });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues', selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setEditingDay(null);
      setEditAmount('');
      toast.success('Ciro kaydedildi');
    },
    onError: () => toast.error('Ciro kaydedilemedi'),
  });

  const startEdit = (day: typeof monthDays[0]) => {
    setEditingDay(day.day);
    setEditAmount(day.amount > 0 ? String(day.amount) : '');
  };

  const confirmEdit = () => {
    if (editingDay === null) return;
    const day = monthDays.find((d) => d.day === editingDay);
    if (!day) return;

    const amount = parseFloat(editAmount) || 0;
    if (amount === day.amount) {
      setEditingDay(null);
      return;
    }

    if (!confirm(`${day.day} ${formatMonth(selectedMonth)} icin ciroyu ${formatCurrency(amount)} olarak kaydetmek istediginize emin misiniz?`)) {
      return;
    }

    saveMutation.mutate({ day, amount });
  };

  const cancelEdit = () => {
    setEditingDay(null);
    setEditAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gunluk Ciro Girisi</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-24 text-center">{formatMonth(selectedMonth)}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Aylik Toplam Ciro</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">{daysWithRevenue} gun ciro girisi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Gunluk Ortalama</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {daysWithRevenue > 0 ? formatCurrency(totalRevenue / daysWithRevenue) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.some((d) => d.amount > 0) && (
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
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Ciro']} />
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium w-[50px]">Gun</th>
                    <th className="text-left py-2 px-3 font-medium">Tarih</th>
                    <th className="text-right py-2 px-3 font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDays.map((day) => (
                    <tr
                      key={day.day}
                      className={`border-b last:border-0 ${day.dayName === 'Paz' || day.dayName === 'Cmt' ? 'bg-gray-50' : ''} ${!day.hasData && editingDay !== day.day ? 'text-gray-400' : ''}`}
                    >
                      <td className="py-2 px-3 font-medium">{day.dayName}</td>
                      <td className="py-2 px-3">
                        {day.day} {formatMonth(selectedMonth)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingDay === day.day ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-32 h-8 text-right"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={confirmEdit} disabled={saveMutation.isPending}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={`cursor-pointer hover:underline ${day.hasData ? 'font-medium' : ''}`}
                            onClick={() => startEdit(day)}
                          >
                            {day.hasData ? formatCurrency(day.amount) : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={2} className="py-2 px-3 font-bold">Toplam</td>
                    <td className="py-2 px-3 text-right font-bold text-green-600">{formatCurrency(totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
