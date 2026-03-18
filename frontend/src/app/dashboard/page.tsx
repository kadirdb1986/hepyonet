'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, TrendingUp, Users, Loader2 } from 'lucide-react';
import api from '@/lib/api';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

interface DashboardData {
  monthlyRevenue: number;
  monthlyExpense: number;
  netProfit: number;
  personnelCount: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    Promise.all([
      api.get('/revenues/summary/monthly', { params: { month: currentMonth } }).then((r) => r.data).catch(() => null),
      api.get('/personnel').then((r) => r.data).catch(() => []),
    ]).then(([summary, personnel]) => {
      setData({
        monthlyRevenue: summary?.totalRevenue ?? 0,
        monthlyExpense: summary?.totalExpenses ?? 0,
        netProfit: summary?.netIncome ?? 0,
        personnelCount: Array.isArray(personnel) ? personnel.filter((p: { isActive: boolean }) => p.isActive).length : 0,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    { title: 'Aylik Ciro', value: data ? formatCurrency(data.monthlyRevenue) : '—', icon: Wallet, color: 'text-green-600' },
    { title: 'Aylik Gider', value: data ? formatCurrency(data.monthlyExpense) : '—', icon: TrendingDown, color: 'text-red-600' },
    { title: 'Net Kar', value: data ? formatCurrency(data.netProfit) : '—', icon: TrendingUp, color: data && data.netProfit >= 0 ? 'text-blue-600' : 'text-red-600' },
    { title: 'Personel', value: data ? String(data.personnelCount) : '—', icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Hos geldiniz, {user?.name}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
