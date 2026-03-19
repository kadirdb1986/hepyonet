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
            <span className="text-xs font-bold text-[#005d63] bg-[#7df4ff] px-2 py-1 rounded-full">+12.4%</span>
          </div>
          <div>
            <p className="text-[#70787d] text-xs font-bold uppercase tracking-wider mb-1">Aylık Ciro</p>
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
            <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-1 rounded-full">-3.2%</span>
          </div>
          <div>
            <p className="text-[#70787d] text-xs font-bold uppercase tracking-wider mb-1">Aylık Giderler</p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <h3 className="font-headline text-2xl font-black text-[#191c1d]">{formatCurrency(data?.monthlyExpense ?? 0)}</h3>
            )}
          </div>
        </div>

        {/* Net Kar - Special dark primary card */}
        <div className="bg-[#004253] p-6 rounded-xl shadow-xl shadow-[#004253]/10 flex flex-col justify-between text-white relative overflow-hidden group">
          {/* Abstract blur background */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <span className="text-xs font-bold text-white bg-white/20 px-2 py-1 rounded-full">+8.1%</span>
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Net Kar</p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            ) : (
              <h3 className="font-headline text-2xl font-black">{formatCurrency(data?.netProfit ?? 0)}</h3>
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

      {/* Contextual FAB - Fixed bottom right */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#004253] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}
