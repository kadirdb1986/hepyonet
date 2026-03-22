'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, Calendar, Plus, TrendingUp, Receipt, Wallet, Users } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

interface DashboardData {
  monthlyRevenue: number;
  monthlyExpense: number;
  grossProfit: number;
  personnelCount: number;
  revenueChangePercent: number | null;
  expenseChangePercent: number | null;
  profitChangePercent: number | null;
  currentMonthName: string;
}

function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-based

    const currentMonth = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

    // Previous month
    const prevDate = new Date(currentYear, currentMonthIdx - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    Promise.all([
      api.get('/revenues/summary/monthly', { params: { month: currentMonth } }).then((r) => r.data).catch(() => null),
      api.get('/revenues/summary/monthly', { params: { month: prevMonth } }).then((r) => r.data).catch(() => null),
      api.get('/personnel').then((r) => r.data).catch(() => []),
    ]).then(([currentSummary, prevSummary, personnel]) => {
      const monthlyRevenue = currentSummary?.totalRevenue ?? 0;
      const monthlyExpense = currentSummary?.totalExpenses ?? 0;
      const grossProfit = monthlyRevenue - monthlyExpense;

      // Previous month: filter revenues & expenses up to the same day
      let prevRevenue = 0;
      let prevExpense = 0;

      if (prevSummary) {
        // Sum revenues up to currentDay of previous month
        const dailyRevenues = prevSummary.dailyRevenues || [];
        for (const r of dailyRevenues) {
          const day = new Date(r.date).getDate();
          if (day <= currentDay) {
            prevRevenue += r.amount;
          }
        }

        // Sum direct expenses up to currentDay of previous month
        const directExpenses = prevSummary.directExpenses || [];
        for (const e of directExpenses) {
          const day = new Date(e.paymentDate).getDate();
          if (day <= currentDay) {
            prevExpense += e.amount;
          }
        }

        // Distributed expenses don't have daily dates, include proportionally
        const totalDistributed = prevSummary.totalDistributedExpenses ?? 0;
        if (totalDistributed > 0) {
          const prevMonthDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0);
          const daysInPrevMonth = prevMonthDate.getDate();
          prevExpense += totalDistributed * (currentDay / daysInPrevMonth);
        }
      }

      const prevGrossProfit = prevRevenue - prevExpense;

      setData({
        monthlyRevenue,
        monthlyExpense,
        grossProfit,
        personnelCount: Array.isArray(personnel) ? personnel.filter((p: { isActive: boolean }) => p.isActive).length : 0,
        revenueChangePercent: calcPercentChange(monthlyRevenue, prevRevenue),
        expenseChangePercent: calcPercentChange(monthlyExpense, prevExpense),
        profitChangePercent: calcPercentChange(grossProfit, prevGrossProfit),
        currentMonthName: MONTH_NAMES[currentMonthIdx],
      });
      setLoading(false);
    });
  }, []);

  function renderBadge(percent: number | null, invertColor?: boolean) {
    if (percent === null) return null;
    const isPositive = percent >= 0;
    const displayPositive = invertColor ? !isPositive : isPositive;
    const formatted = `${isPositive ? '+' : ''}${percent.toFixed(1)}%`;

    return (
      <Badge
        className={
          displayPositive
            ? 'text-primary bg-secondary'
            : 'text-destructive bg-destructive/10'
        }
      >
        {formatted}
      </Badge>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary mb-1">
            Hoş geldiniz, {user?.name}
          </h2>
          <p className="text-muted-foreground font-medium">İşte bugün restoranınızdaki son durum özeti.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="px-5 py-2.5 rounded-xl font-bold">
            <Calendar className="size-5" />
            <span>Bugün</span>
          </Button>
          <Button className="px-6 py-2.5 rounded-xl font-bold shadow-lg">
            <Plus className="size-5" />
            <span>Yeni Sipariş</span>
          </Button>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Aylık Ciro */}
        <Card className="flex flex-col justify-between group hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <TrendingUp className="size-5" />
              </div>
              {!loading && renderBadge(data?.revenueChangePercent ?? null)}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">
                {data?.currentMonthName ?? ''} Ayı Cirosu
              </p>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <h3 className="font-headline text-2xl font-black text-foreground">{formatCurrency(data?.monthlyRevenue ?? 0)}</h3>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aylık Giderler */}
        <Card className="flex flex-col justify-between group hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive">
                <Receipt className="size-5" />
              </div>
              {!loading && renderBadge(data?.expenseChangePercent ?? null, true)}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">
                {data?.currentMonthName ?? ''} Ayı Gideri
              </p>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <h3 className="font-headline text-2xl font-black text-foreground">{formatCurrency(data?.monthlyExpense ?? 0)}</h3>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Brüt Kar */}
        <Card className="bg-primary flex flex-col justify-between text-primary-foreground relative overflow-hidden group shadow-xl">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-primary-foreground">
                <Wallet className="size-5" />
              </div>
              {!loading && data?.profitChangePercent != null && (
                <Badge
                  className={
                    data.profitChangePercent >= 0
                      ? 'text-primary-foreground bg-white/20'
                      : 'text-destructive-foreground bg-destructive/30'
                  }
                >
                  {data.profitChangePercent >= 0 ? '+' : ''}{data.profitChangePercent.toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="relative z-10">
              <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider mb-1">Brüt Kar</p>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary-foreground/50" />
              ) : (
                <h3 className="font-headline text-2xl font-black">{formatCurrency(data?.grossProfit ?? 0)}</h3>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personel Sayısı */}
        <Card className="flex flex-col justify-between group hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground">
                <Users className="size-5" />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Personel Sayısı</p>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <h3 className="font-headline text-2xl font-black text-foreground">{data?.personnelCount ?? 0} Aktif</h3>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contextual FAB */}
      <Button
        size="icon"
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl hover:scale-110 transition-transform z-50"
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}
