'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

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
      <span
        className={`text-xs font-bold px-2 py-1 rounded-full ${
          displayPositive
            ? 'text-[#005d63] bg-[#7df4ff]'
            : 'text-[#ba1a1a] bg-[#ffdad6]'
        }`}
      >
        {formatted}
      </span>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#004253] mb-1">
            Hoş geldiniz, {user?.name}
          </h2>
          <p className="text-[#70787d] font-medium">İşte bugün restoranınızdaki son durum özeti.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#f2f4f5] text-[#004253] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6e8e9] transition-all">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
            <span>Bugün</span>
          </button>
          <button className="bg-[#004253] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#004253]/20 hover:scale-[1.02] transition-transform">
            <span className="material-symbols-outlined text-xl">add</span>
            <span>Yeni Sipariş</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Aylık Ciro */}
        <div className="bg-white p-6 rounded-xl shadow-xs ring-1 ring-[#bfc8cc]/10 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#005b71]/10 rounded-xl flex items-center justify-center text-[#004253]">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            {!loading && renderBadge(data?.revenueChangePercent ?? null)}
          </div>
          <div>
            <p className="text-[#70787d] text-xs font-bold uppercase tracking-wider mb-1">
              {data?.currentMonthName ?? ''} Ayı Cirosu
            </p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <h3 className="font-headline text-2xl font-black text-[#191c1d]">{formatCurrency(data?.monthlyRevenue ?? 0)}</h3>
            )}
          </div>
        </div>

        {/* Aylık Giderler */}
        <div className="bg-white p-6 rounded-xl shadow-xs ring-1 ring-[#bfc8cc]/10 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#ffdad6]/20 rounded-xl flex items-center justify-center text-[#ba1a1a]">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            {!loading && renderBadge(data?.expenseChangePercent ?? null, true)}
          </div>
          <div>
            <p className="text-[#70787d] text-xs font-bold uppercase tracking-wider mb-1">
              {data?.currentMonthName ?? ''} Ayı Gideri
            </p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <h3 className="font-headline text-2xl font-black text-[#191c1d]">{formatCurrency(data?.monthlyExpense ?? 0)}</h3>
            )}
          </div>
        </div>

        {/* Brüt Kar */}
        <div className="bg-[#004253] p-6 rounded-xl shadow-xl shadow-[#004253]/10 flex flex-col justify-between text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            {!loading && data?.profitChangePercent != null && (
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  data.profitChangePercent >= 0
                    ? 'text-white bg-white/20'
                    : 'text-[#ffdad6] bg-[#ba1a1a]/30'
                }`}
              >
                {data.profitChangePercent >= 0 ? '+' : ''}{data.profitChangePercent.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Brüt Kar</p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            ) : (
              <h3 className="font-headline text-2xl font-black">{formatCurrency(data?.grossProfit ?? 0)}</h3>
            )}
          </div>
        </div>

        {/* Personel Sayısı */}
        <div className="bg-white p-6 rounded-xl shadow-xs ring-1 ring-[#bfc8cc]/10 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#d4e6e9] rounded-xl flex items-center justify-center text-[#516164]">
              <span className="material-symbols-outlined text-2xl">group</span>
            </div>
            <span className="text-xs font-bold text-[#516164] bg-[#d4e6e9]/50 px-2 py-1 rounded-full">Sabit</span>
          </div>
          <div>
            <p className="text-[#70787d] text-xs font-bold uppercase tracking-wider mb-1">Personel Sayısı</p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <h3 className="font-headline text-2xl font-black text-[#191c1d]">{data?.personnelCount ?? 0} Aktif</h3>
            )}
          </div>
        </div>
      </div>

      {/* Contextual FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#004253] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}
