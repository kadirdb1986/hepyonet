'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

const COLORS = ['#004253', '#005b71', '#ba1a1a', '#bfc8cc'];

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Personel',
  BILL: 'Kira & Faturalar',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Hammadde',
  OTHER: 'Diğer',
};

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const ITEMS_PER_PAGE = 10;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function getDayName(day: number, month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  return DAY_NAMES[date.getDay()];
}

function formatDateFull(day: number, month: string): string {
  const [y, m] = month.split('-');
  return `${day} ${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

/** SVG donut chart - matches Stitch design exactly */
function DonutChart({ data, colors, total }: { data: { name: string; value: number }[]; colors: string[]; total: number }) {
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius; // ~99.9

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const dashArray = `${pct}, ${100 - pct}`;
    const dashOffset = -offset;
    offset += pct;
    return (
      <circle
        key={d.name}
        cx="18"
        cy="18"
        r={radius}
        fill="transparent"
        stroke={colors[i % colors.length]}
        strokeWidth="4"
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
      />
    );
  });

  return (
    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={radius} fill="transparent" stroke="#e1e3e4" strokeWidth="4" />
      {segments}
    </svg>
  );
}

export default function FinanceOverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [chartTab, setChartTab] = useState<'daily' | 'weekly'>('daily');
  const [currentPage, setCurrentPage] = useState(1);

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setCurrentPage(1);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setCurrentPage(1);
  };

  const { data: summary, isLoading } = useQuery({
    queryKey: ['finance-summary', selectedMonth],
    queryFn: async () => {
      const { data } = await api.get('/revenues/summary/monthly', {
        params: { month: selectedMonth },
      });
      return data;
    },
  });

  const categoryData = useMemo(() => {
    if (!summary?.categoryBreakdown) return [];
    return Object.entries(summary.categoryBreakdown).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value: value as number,
    }));
  }, [summary]);

  const categoryTotal = useMemo(() => {
    return categoryData.reduce((sum, c) => sum + c.value, 0);
  }, [categoryData]);

  const dailyRevenueData = useMemo(() => {
    if (!summary?.dailyRevenues) return [];
    return summary.dailyRevenues.map((r: any) => ({
      day: new Date(r.date).getDate(),
      amount: r.amount,
    }));
  }, [summary]);

  const maxRevenue = useMemo(() => {
    if (dailyRevenueData.length === 0) return 1;
    return Math.max(...dailyRevenueData.map((d: any) => d.amount), 1);
  }, [dailyRevenueData]);

  // Son 7 gün ve önceki 7 gün verileri (mini bar chart + yüzde değişim)
  const { last7Revenue, prev7Revenue, revenuePctChange, last7Expense, prev7Expense, expensePctChange } = useMemo(() => {
    if (!summary?.dailyBreakdown) return { last7Revenue: [] as number[], prev7Revenue: 0, revenuePctChange: 0, last7Expense: [] as number[], prev7Expense: 0, expensePctChange: 0 };

    // dailyBreakdown'ı veri olan günlere filtrele ve ters çevir (en yeni başta)
    const allDays = (summary.dailyBreakdown as any[]).filter((d: any) => d.revenue > 0 || d.expense > 0);
    const sorted = [...allDays].sort((a: any, b: any) => b.day - a.day);

    const last7 = sorted.slice(0, 7).reverse(); // son 7 gün (kronolojik sıra)
    const prev7 = sorted.slice(7, 14);

    const last7Rev = last7.map((d: any) => Number(d.revenue));
    const last7Exp = last7.map((d: any) => Number(d.expense));

    const last7RevTotal = last7Rev.reduce((s, v) => s + v, 0);
    const prev7RevTotal = prev7.reduce((s, d: any) => s + Number(d.revenue), 0);
    const last7ExpTotal = last7Exp.reduce((s, v) => s + v, 0);
    const prev7ExpTotal = prev7.reduce((s, d: any) => s + Number(d.expense), 0);

    const revPct = prev7RevTotal > 0 ? Math.round(((last7RevTotal - prev7RevTotal) / prev7RevTotal) * 100) : 0;
    const expPct = prev7ExpTotal > 0 ? Math.round(((last7ExpTotal - prev7ExpTotal) / prev7ExpTotal) * 100) : 0;

    return {
      last7Revenue: last7Rev,
      prev7Revenue: prev7RevTotal,
      revenuePctChange: revPct,
      last7Expense: last7Exp,
      prev7Expense: prev7ExpTotal,
      expensePctChange: expPct,
    };
  }, [summary]);

  const filteredBreakdown = useMemo(() => {
    if (!summary?.dailyBreakdown) return [];
    return summary.dailyBreakdown.filter((d: any) => d.revenue > 0 || d.expense > 0);
  }, [summary]);

  const totalPages = Math.ceil(filteredBreakdown.length / ITEMS_PER_PAGE);
  const paginatedBreakdown = filteredBreakdown.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
    return amount.toString();
  };

  return (
    <div className="pb-24">
      {/* Page header */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[#004253] font-bold tracking-widest text-[11px] uppercase mb-2">Finansal Yönetim</p>
          <h1 className="text-4xl font-extrabold text-[#191c1d] tracking-tight mb-2">Finans Özeti</h1>
          <p className="text-[#70787d] max-w-xl">Restoranınızın nakit akışını, günlük cirolarını ve gider dağılımlarını tek bir merkezden takip edin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month picker pill */}
          <div className="bg-[#f2f4f5] px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-[#70787d]">calendar_today</span>
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </Button>
            <span className="font-semibold text-[#40484c] min-w-[100px] text-center">{formatMonth(selectedMonth)}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Button>
          </div>

          {/* Dışa Aktar button */}
          <button className="flex items-center gap-2 bg-white text-[#004253] px-5 py-2.5 rounded-xl font-bold shadow-xs hover:bg-slate-50 transition-all text-sm">
            <span className="material-symbols-outlined text-lg">upload</span>
            Dışa Aktar
          </button>

          {/* Yeni İşlem button */}
          <button className="flex items-center gap-2 bg-gradient-to-br from-[#004253] to-[#005b71] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-[#004253]/20 hover:scale-[1.02] transition-all text-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            Yeni İşlem
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#70787d]">Yükleniyor...</p>
        </div>
      ) : !summary ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#70787d]">Bu ay için veri bulunamadı</p>
        </div>
      ) : (
        <>
          {/* Summary Grid - exact Stitch layout */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Card: Toplam Ciro */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#bfc8cc]/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-[#004253]">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                {revenuePctChange !== 0 && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${revenuePctChange > 0 ? 'text-[#004448] bg-[#7df4ff]' : 'text-[#93000a] bg-[#ffdad6]'}`}>
                    {revenuePctChange > 0 ? '+' : ''}{revenuePctChange}%
                  </span>
                )}
              </div>
              <p className="text-[#70787d] text-sm font-medium mb-1">Toplam Ciro</p>
              <h3 className="text-3xl font-black text-[#191c1d]">{formatCurrency(summary.totalRevenue)}</h3>
              {last7Revenue.length > 0 && (
                <div className="mt-4 h-12 w-full flex items-end gap-1">
                  {(() => {
                    const max = Math.max(...last7Revenue, 1);
                    return last7Revenue.map((val, i) => {
                      const pct = Math.max(5, (val / max) * 100);
                      const isLast = i === last7Revenue.length - 1;
                      const isSecondLast = i === last7Revenue.length - 2;
                      const alpha = isLast ? 1 : isSecondLast ? 0.4 : 0.2;
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm"
                          style={{ height: `${pct}%`, backgroundColor: `rgba(0, 66, 83, ${alpha})` }}
                        />
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Card: Toplam Gider */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#bfc8cc]/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-[#ba1a1a]">
                  <span className="material-symbols-outlined">trending_down</span>
                </div>
                {expensePctChange !== 0 && (
                  <span className="text-xs font-bold text-[#93000a] px-2 py-1 bg-[#ffdad6] rounded-full">
                    {expensePctChange > 0 ? '+' : ''}{expensePctChange}%
                  </span>
                )}
              </div>
              <p className="text-[#70787d] text-sm font-medium mb-1">Toplam Gider</p>
              <h3 className="text-3xl font-black text-[#191c1d]">{formatCurrency(summary.totalExpenses)}</h3>
              {last7Expense.length > 0 && (
                <div className="mt-4 h-12 w-full flex items-end gap-1">
                  {(() => {
                    const max = Math.max(...last7Expense, 1);
                    return last7Expense.map((val, i) => {
                      const pct = Math.max(5, (val / max) * 100);
                      const intensity = Math.round(10 + (i / (last7Expense.length - 1)) * 30);
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm"
                          style={{ height: `${pct}%`, backgroundColor: `rgba(186, 26, 26, ${intensity / 100})` }}
                        />
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Card: Net Gelir */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#bfc8cc]/5 ring-2 ring-[#004253]/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#005b71] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                {summary.netIncome >= 0 && (
                  <span className="text-xs font-bold text-white px-2 py-1 bg-[#004253] rounded-full">Kârlı</span>
                )}
              </div>
              <p className="text-[#004253] text-sm font-medium mb-1">Net Gelir</p>
              <h3 className="text-3xl font-black text-[#004253]">{formatCurrency(summary.netIncome)}</h3>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#004253] animate-pulse" />
                <p className="text-[11px] font-bold text-[#bfc8cc] uppercase tracking-wider">Ay Sonu Projeksiyonu</p>
              </div>
            </div>
          </section>

          {/* Main Charts Area - Bento Layout */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Left: Günlük Ciro Analizi - Custom bar chart matching Stitch */}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-xs border border-[#bfc8cc]/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-[#191c1d]">Günlük Ciro Analizi</h3>
                  <p className="text-sm text-[#70787d]">{formatMonth(selectedMonth)} ayı günlük performans grafiği</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartTab('daily')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      chartTab === 'daily'
                        ? 'bg-[#f2f4f5] text-[#004253]'
                        : 'text-[#70787d] hover:bg-slate-50'
                    }`}
                  >
                    Günlük
                  </button>
                  <button
                    onClick={() => setChartTab('weekly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      chartTab === 'weekly'
                        ? 'bg-[#f2f4f5] text-[#004253]'
                        : 'text-[#70787d] hover:bg-slate-50'
                    }`}
                  >
                    Haftalık
                  </button>
                </div>
              </div>
              {dailyRevenueData.length === 0 ? (
                <p className="text-[#70787d] text-sm text-center py-8">
                  Bu ay için ciro verisi yok
                </p>
              ) : (
                /* Custom thin-bar chart matching Stitch design */
                <div className="aspect-[16/7] relative w-full flex items-end justify-between px-4 pb-8">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-[#bfc8cc]/20">
                    <div className="w-full h-px bg-[#bfc8cc]/10"></div>
                    <div className="w-full h-px bg-[#bfc8cc]/10"></div>
                    <div className="w-full h-px bg-[#bfc8cc]/10"></div>
                    <div className="w-full h-px bg-[#bfc8cc]/10"></div>
                  </div>
                  {/* Area gradient background */}
                  <div className="absolute bottom-10 left-0 w-full h-32 opacity-10 pointer-events-none">
                    <div
                      className="w-full h-full bg-gradient-to-t from-[#004253] to-transparent"
                      style={{
                        clipPath: `polygon(${dailyRevenueData.map((d: any, i: number) => {
                          const x = (i / (dailyRevenueData.length - 1)) * 100;
                          const y = 100 - (d.amount / maxRevenue) * 80;
                          return `${x}% ${y}%`;
                        }).join(', ')}, 100% 100%, 0% 100%)`,
                      }}
                    ></div>
                  </div>
                  {/* Interactive bar points */}
                  {dailyRevenueData.map((d: any, i: number) => {
                    const heightPct = Math.max(5, (d.amount / maxRevenue) * 90);
                    const isHighest = d.amount === maxRevenue;
                    return (
                      <div key={d.day} className="relative group cursor-pointer h-full w-4 flex flex-col justify-end">
                        <div
                          className={`${isHighest ? 'w-2 bg-[#004253] shadow-md shadow-[#004253]/20' : 'w-1 bg-[#004253]/20 group-hover:bg-[#004253]'} rounded-full mx-auto transition-all`}
                          style={{ height: `${heightPct}%` }}
                        ></div>
                        <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] ${isHighest ? 'font-bold text-[#004253]' : 'text-[#70787d]'}`}>
                          {String(d.day).padStart(2, '0')}
                        </span>
                        {/* Tooltip on hover */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#191c1d] text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {formatCurrency(d.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Gider Kategorileri - SVG Donut matching Stitch */}
            <div className="bg-white p-8 rounded-2xl shadow-xs border border-[#bfc8cc]/5">
              <h3 className="text-xl font-bold text-[#191c1d] mb-1">Gider Kategorileri</h3>
              <p className="text-sm text-[#70787d] mb-8">Dağılım Analizi</p>
              {categoryData.length === 0 ? (
                <p className="text-[#70787d] text-sm text-center py-8">
                  Bu ay için gider verisi yok
                </p>
              ) : (
                <>
                  <div className="flex justify-center mb-8">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <DonutChart data={categoryData} colors={COLORS} total={categoryTotal} />
                      <div className="absolute text-center">
                        <p className="text-[10px] font-bold text-[#70787d] uppercase">Toplam</p>
                        <p className="text-lg font-black text-[#191c1d]">{formatCompact(categoryTotal)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {categoryData.map((cat, index) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-[#40484c]">{cat.name}</span>
                        </div>
                        <span className="text-sm font-bold">
                          {categoryTotal > 0 ? `${Math.round((cat.value / categoryTotal) * 100)}%` : '0%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Data Table Section */}
          {filteredBreakdown.length > 0 && (
            <section className="bg-white rounded-2xl shadow-xs border border-[#bfc8cc]/5 overflow-hidden">
              <div className="p-8 border-b border-[#bfc8cc]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#191c1d]">Gün Gün Gelir / Gider</h3>
                  <p className="text-sm text-[#70787d]">Son 30 günlük detaylı işlem listesi</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/30 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                    Filtrele
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/30 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                    <span className="material-symbols-outlined text-sm">search</span>
                    Bul
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f2f4f5]">
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Tarih</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Ciro</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Gider</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Net Durum</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bfc8cc]/10">
                    {paginatedBreakdown.map((d: any) => (
                      <tr key={d.day} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#191c1d]">{formatDateFull(d.day, selectedMonth)}</span>
                            <span className="text-[10px] text-[#70787d] uppercase font-bold">{getDayName(d.day, selectedMonth)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-teal-700">
                            {d.revenue > 0 ? formatCurrency(d.revenue) : '\u2014'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-medium text-[#ba1a1a]">
                            {d.expense > 0 ? formatCurrency(d.expense) : '\u2014'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${d.net >= 0 ? 'bg-teal-500' : 'bg-[#ba1a1a]'}`} />
                            <span className="text-sm font-bold text-[#191c1d]">
                              {formatCurrency(d.net)}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <button className="text-[#004253] hover:underline text-sm font-bold">İncele</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="bg-[#f2f4f5] border-t-2 border-[#bfc8cc]/20">
                      <td className="px-8 py-5 text-sm font-black text-[#191c1d]">Toplam</td>
                      <td className="px-8 py-5 text-sm font-bold text-teal-700">{formatCurrency(summary.totalRevenue)}</td>
                      <td className="px-8 py-5 text-sm font-medium text-[#ba1a1a]">{formatCurrency(summary.totalExpenses)}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${summary.netIncome >= 0 ? 'bg-teal-500' : 'bg-[#ba1a1a]'}`} />
                          <span className="text-sm font-bold text-[#191c1d]">{formatCurrency(summary.netIncome)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Pagination footer */}
              <div className="p-6 bg-[#f2f4f5] flex items-center justify-between border-t border-[#bfc8cc]/10">
                <span className="text-xs font-medium text-[#70787d]">
                  Toplam {filteredBreakdown.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredBreakdown.length)} arası gösteriliyor
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded bg-white flex items-center justify-center border border-[#bfc8cc]/30 text-[#70787d] hover:text-[#004253] transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs transition-all ${
                        page === currentPage
                          ? 'bg-[#004253] text-white'
                          : 'bg-white border border-[#bfc8cc]/30 text-[#40484c] hover:text-[#004253]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded bg-white flex items-center justify-center border border-[#bfc8cc]/30 text-[#70787d] hover:text-[#004253] transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Quick Action Floating Section */}
          <div className="mt-12 flex justify-center">
            <div className="bg-[#e1e3e4] px-8 py-4 rounded-full flex items-center gap-8 shadow-xl">
              <Link href="/dashboard/finance/expenses" className="flex flex-col items-center gap-1 group">
                <span className="material-symbols-outlined text-[#70787d] group-hover:text-[#004253] transition-colors">receipt_long</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-[#70787d] group-hover:text-[#004253]">Giderler</span>
              </Link>
              <div className="w-px h-8 bg-[#bfc8cc]/40" />
              <Link href="/dashboard/finance/revenues" className="flex flex-col items-center gap-1 group">
                <span className="material-symbols-outlined text-[#70787d] group-hover:text-[#004253] transition-colors">point_of_sale</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-[#70787d] group-hover:text-[#004253]">Cirolar</span>
              </Link>
              <div className="w-px h-8 bg-[#bfc8cc]/40" />
              <Link href="/dashboard/finance/expenses" className="flex flex-col items-center gap-1 group">
                <span className="material-symbols-outlined text-[#70787d] group-hover:text-[#004253] transition-colors">request_quote</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-[#70787d] group-hover:text-[#004253]">Vergi</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
