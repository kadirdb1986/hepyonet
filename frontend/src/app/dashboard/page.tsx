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

// Placeholder data for sections without API data yet
const placeholderOrders = [
  {
    id: '#9281',
    table: 'Masa 12',
    author: 'Kadir D. tarafından girildi',
    amount: 420.0,
    method: 'Kredi Kartı',
    status: 'Tamamlandı',
    statusStyle: 'bg-[#7df4ff] text-[#004f54]',
  },
  {
    id: '#9280',
    table: 'Paket Servis',
    author: 'Mobil Uygulama',
    amount: 185.5,
    method: 'Nakit',
    status: 'Hazırlanıyor',
    statusStyle: 'bg-[#d4e6e9] text-[#57676a]',
  },
  {
    id: '#9279',
    table: 'Masa 4',
    author: 'Ayşe K. tarafından girildi',
    amount: 610.0,
    method: 'Kredi Kartı',
    status: 'Tamamlandı',
    statusStyle: 'bg-[#7df4ff] text-[#004f54]',
  },
];

const placeholderTopSelling = [
  { name: 'Plaçka Köfte', count: '124 adet / hafta', price: '₺180' },
  { name: 'Kuzu Şiş', count: '98 adet / hafta', price: '₺245' },
  { name: 'Fıstıklı Baklava', count: '82 adet / hafta', price: '₺120' },
];

const placeholderStockAlerts = [
  { item: 'Kıyma (Dana)', remaining: '2.5kg kaldı' },
  { item: 'Ayçiçek Yağı', remaining: '5L kaldı' },
  { item: 'Domates', remaining: '12kg kaldı' },
];

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

      {/* Detailed Insights Section - 3 column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Operations - Son Siparişler (Left 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#f2f4f5] rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-headline text-xl font-bold text-[#004253]">Son Siparişler</h3>
              <button className="text-[#004253] font-bold text-sm hover:underline">Tümünü Gör</button>
            </div>
            <div className="space-y-4">
              {placeholderOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-5 rounded-xl flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#e6e8e9] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#004253]">receipt_long</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#191c1d]">
                        {order.id} - {order.table}
                      </p>
                      <p className="text-xs text-[#70787d]">{order.author}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div>
                      <p className="font-bold text-[#191c1d]">₺{order.amount.toFixed(2)}</p>
                      <p className="text-[10px] text-[#70787d] uppercase">{order.method}</p>
                    </div>
                    <span
                      className={`${order.statusStyle} px-3 py-1 rounded-full text-[10px] font-black uppercase`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Insights (Right 1/3) */}
        <div className="space-y-8">
          {/* En Çok Satanlar */}
          <div className="bg-white rounded-2xl p-6 ring-1 ring-[#bfc8cc]/10 shadow-xs">
            <h3 className="font-headline text-lg font-bold text-[#191c1d] mb-6">En Çok Satanlar</h3>
            <div className="space-y-6">
              {placeholderTopSelling.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#004253]">fastfood</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-xs text-[#70787d]">{item.count}</p>
                    </div>
                  </div>
                  <span className="text-[#004253] font-bold">{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kritik Stok Uyarıları */}
          <div className="bg-[#ffdad6]/30 rounded-2xl p-6 ring-1 ring-[#ba1a1a]/10">
            <div className="flex items-center gap-3 text-[#ba1a1a] mb-4">
              <span className="material-symbols-outlined">warning</span>
              <h3 className="font-headline font-bold">Kritik Stok Uyarıları</h3>
            </div>
            <ul className="space-y-2 text-sm font-medium">
              {placeholderStockAlerts.map((alert, index) => (
                <li
                  key={alert.item}
                  className={`flex justify-between py-2 ${index < placeholderStockAlerts.length - 1 ? 'border-b border-[#ba1a1a]/5' : ''}`}
                >
                  <span className="text-[#40484c]">{alert.item}</span>
                  <span className="text-[#ba1a1a] font-bold">{alert.remaining}</span>
                </li>
              ))}
            </ul>
            <button className="w-full mt-4 py-2 bg-[#ba1a1a] text-white rounded-xl font-bold text-sm hover:bg-[#ba1a1a]/90 transition-colors">
              Stok Siparişi Ver
            </button>
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
