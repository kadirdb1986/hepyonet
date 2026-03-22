'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
  Search,
  Receipt,
  Monitor,
  FileText,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

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

export default function FinanceOverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [chartTab, setChartTab] = useState<'daily' | 'weekly'>('daily');
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

  // Haftalık ciro verisi: ayın haftalarına göre grupla
  const weeklyRevenueData = useMemo(() => {
    if (!summary?.dailyBreakdown) return [];
    const weeks: { label: string; amount: number }[] = [];
    const days = summary.dailyBreakdown as any[];
    // Haftaları 7'şerli grupla (1-7, 8-14, 15-21, 22-28, 29+)
    // Seçili ay bu ay mı? Bu ay ise bugüne kadarki haftaları göster.
    const now = new Date();
    const [selY, selM] = selectedMonth.split('-').map(Number);
    const isCurrentMonth = selY === now.getFullYear() && selM === now.getMonth() + 1;
    const maxDay = isCurrentMonth ? now.getDate() : 31;

    const weekRanges = [
      { start: 1, end: 7, label: '1. Hafta' },
      { start: 8, end: 14, label: '2. Hafta' },
      { start: 15, end: 21, label: '3. Hafta' },
      { start: 22, end: 28, label: '4. Hafta' },
      { start: 29, end: 31, label: '5. Hafta' },
    ];
    for (const range of weekRanges) {
      // Haftanın başlangıcı bugünden sonraysa gösterme
      if (range.start > maxDay) break;
      const total = days
        .filter((d: any) => d.day >= range.start && d.day <= range.end)
        .reduce((sum: number, d: any) => sum + Number(d.revenue), 0);
      weeks.push({ label: range.label, amount: total });
    }
    return weeks;
  }, [summary]);

  const maxWeeklyRevenue = useMemo(() => {
    if (weeklyRevenueData.length === 0) return 1;
    return Math.max(...weeklyRevenueData.map((w) => w.amount), 1);
  }, [weeklyRevenueData]);

  // Son 7 gün ve önceki 7 gün verileri (mini bar chart + yüzde değişim)
  const { last7Days, revenuePctChange, expensePctChange } = useMemo(() => {
    if (!summary?.dailyBreakdown) return { last7Days: [] as { day: number; revenue: number; expense: number }[], revenuePctChange: 0, expensePctChange: 0 };

    const allDays = (summary.dailyBreakdown as any[]).filter((d: any) => d.revenue > 0 || d.expense > 0);
    const sorted = [...allDays].sort((a: any, b: any) => b.day - a.day);

    const last7 = sorted.slice(0, 7).reverse();
    const prev7 = sorted.slice(7, 14);

    const last7RevTotal = last7.reduce((s, d: any) => s + Number(d.revenue), 0);
    const prev7RevTotal = prev7.reduce((s, d: any) => s + Number(d.revenue), 0);
    const last7ExpTotal = last7.reduce((s, d: any) => s + Number(d.expense), 0);
    const prev7ExpTotal = prev7.reduce((s, d: any) => s + Number(d.expense), 0);

    const revPct = prev7RevTotal > 0 ? Math.round(((last7RevTotal - prev7RevTotal) / prev7RevTotal) * 100) : 0;
    const expPct = prev7ExpTotal > 0 ? Math.round(((last7ExpTotal - prev7ExpTotal) / prev7ExpTotal) * 100) : 0;

    return {
      last7Days: last7.map((d: any) => ({ day: Number(d.day), revenue: Number(d.revenue), expense: Number(d.expense) })),
      revenuePctChange: revPct,
      expensePctChange: expPct,
    };
  }, [summary]);

  const filteredBreakdown = useMemo(() => {
    if (!summary?.dailyBreakdown) return [];
    // Seçili ay bu ay ise bugüne kadar, geçmiş ay ise tümü
    const now = new Date();
    const [selY, selM] = selectedMonth.split('-').map(Number);
    const isCurrentMonth = selY === now.getFullYear() && selM === now.getMonth() + 1;
    const maxDay = isCurrentMonth ? now.getDate() : 31;
    return [...summary.dailyBreakdown]
      .filter((d: any) => d.day <= maxDay)
      .sort((a: any, b: any) => b.day - a.day);
  }, [summary, selectedMonth]);

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
          <p className="text-primary font-bold tracking-widest text-[11px] uppercase mb-2">Finansal Yonetim</p>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">Finans Ozeti</h1>
          <p className="text-muted-foreground max-w-xl">Restoraninizin nakit akisini, gunluk cirolarini ve gider dagilimlarini tek bir merkezden takip edin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month picker pill */}
          <div className="bg-muted px-4 py-2 rounded-xl flex items-center gap-3">
            <Calendar className="size-5 text-muted-foreground" />
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="font-semibold text-foreground min-w-[100px] text-center">{formatMonth(selectedMonth)}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Disa Aktar button */}
          <button className="flex items-center gap-2 bg-card text-primary px-5 py-2.5 rounded-xl font-bold shadow-xs hover:bg-muted transition-all text-sm">
            <Upload className="size-5" />
            Disa Aktar
          </button>

          {/* Yeni Islem button */}
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all text-sm">
            <Plus className="size-5" />
            Yeni Islem
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yukleniyor...</p>
        </div>
      ) : !summary ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Bu ay icin veri bulunamadi</p>
        </div>
      ) : (
        <>
          {/* Summary Grid - exact Stitch layout */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Card: Toplam Ciro */}
            <div className="bg-card p-6 rounded-xl shadow-xs border border-border/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp className="size-5" />
                </div>
                {revenuePctChange !== 0 && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${revenuePctChange > 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
                    {revenuePctChange > 0 ? '+' : ''}{revenuePctChange}%
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Toplam Ciro</p>
              <h3 className="text-3xl font-black text-foreground">{formatCurrency(summary.totalRevenue)}</h3>
              {last7Days.length > 0 && (
                <div className="mt-4 h-12 w-full flex items-end gap-1">
                  {(() => {
                    const max = Math.max(...last7Days.map((d) => d.revenue), 1);
                    return last7Days.map((d, i) => {
                      const pct = Math.max(5, (d.revenue / max) * 100);
                      const isLast = i === last7Days.length - 1;
                      const isSecondLast = i === last7Days.length - 2;
                      return (
                        <div key={i} className="relative flex-1 h-full flex flex-col justify-end group">
                          <div
                            className={`w-full rounded-t-sm cursor-pointer transition-all group-hover:opacity-80 ${isLast ? 'bg-primary' : isSecondLast ? 'bg-primary/40' : 'bg-primary/20'}`}
                            style={{ height: `${pct}%` }}
                          />
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {d.day} {formatMonth(selectedMonth).split(' ')[0]}: {formatCurrency(d.revenue)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Card: Toplam Gider */}
            <div className="bg-card p-6 rounded-xl shadow-xs border border-border/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                  <TrendingDown className="size-5" />
                </div>
                {expensePctChange !== 0 && (
                  <span className="text-xs font-bold text-destructive px-2 py-1 bg-destructive/10 rounded-full">
                    {expensePctChange > 0 ? '+' : ''}{expensePctChange}%
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Toplam Gider</p>
              <h3 className="text-3xl font-black text-foreground">{formatCurrency(summary.totalExpenses)}</h3>
              {last7Days.length > 0 && (
                <div className="mt-4 h-12 w-full flex items-end gap-1">
                  {(() => {
                    const max = Math.max(...last7Days.map((d) => d.expense), 1);
                    return last7Days.map((d, i) => {
                      const intensity = Math.round(10 + (i / (last7Days.length - 1)) * 30);
                      const pct = Math.max(5, (d.expense / max) * 100);
                      return (
                        <div key={i} className="relative flex-1 h-full flex flex-col justify-end group">
                          <div
                            className="w-full rounded-t-sm cursor-pointer transition-all group-hover:opacity-80"
                            style={{ height: `${pct}%`, opacity: intensity / 100 }}
                          >
                            <div className="w-full h-full bg-destructive rounded-t-sm" />
                          </div>
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {d.day} {formatMonth(selectedMonth).split(' ')[0]}: {formatCurrency(d.expense)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Card: Net Gelir */}
            <div className="bg-card p-6 rounded-xl shadow-xs border border-border/5 ring-2 ring-primary/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  <Wallet className="size-5" />
                </div>
                {summary.netIncome >= 0 && (
                  <span className="text-xs font-bold text-primary-foreground px-2 py-1 bg-primary rounded-full">Karli</span>
                )}
              </div>
              <p className="text-primary text-sm font-medium mb-1">Net Gelir</p>
              <h3 className="text-3xl font-black text-primary">{formatCurrency(summary.netIncome)}</h3>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ay Sonu Projeksiyonu</p>
              </div>
            </div>
          </section>

          {/* Main Charts Area - Bento Layout */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Left: Gunluk Ciro Analizi - Custom bar chart matching Stitch */}
            <div className="lg:col-span-2 bg-card p-8 rounded-2xl shadow-xs border border-border/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Gunluk Ciro Analizi</h3>
                  <p className="text-sm text-muted-foreground">{formatMonth(selectedMonth)} ayi {chartTab === 'daily' ? 'gunluk' : 'haftalik'} performans grafigi</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartTab('daily')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      chartTab === 'daily'
                        ? 'bg-muted text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Gunluk
                  </button>
                  <button
                    onClick={() => setChartTab('weekly')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      chartTab === 'weekly'
                        ? 'bg-muted text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Haftalik
                  </button>
                </div>
              </div>
              {chartTab === 'daily' ? (
                /* Gunluk: thin-bar chart */
                dailyRevenueData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Bu ay icin ciro verisi yok</p>
                ) : (
                  <div className="aspect-[16/7] relative w-full flex items-end justify-between px-4 pb-8">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-border/20">
                      <div className="w-full h-px bg-border/10"></div>
                      <div className="w-full h-px bg-border/10"></div>
                      <div className="w-full h-px bg-border/10"></div>
                      <div className="w-full h-px bg-border/10"></div>
                    </div>
                    {/* Area gradient background */}
                    <div className="absolute bottom-10 left-0 w-full h-32 opacity-10 pointer-events-none">
                      <div
                        className="w-full h-full bg-gradient-to-t from-primary to-transparent"
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
                    {dailyRevenueData.map((d: any) => {
                      const heightPct = Math.max(5, (d.amount / maxRevenue) * 90);
                      const isHighest = d.amount === maxRevenue;
                      return (
                        <div key={d.day} className="relative group cursor-pointer h-full w-4 flex flex-col justify-end">
                          <div
                            className={`${isHighest ? 'w-2 bg-primary shadow-md shadow-primary/20' : 'w-1 bg-primary/20 group-hover:bg-primary'} rounded-full mx-auto transition-all`}
                            style={{ height: `${heightPct}%` }}
                          ></div>
                          <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] ${isHighest ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                            {String(d.day).padStart(2, '0')}
                          </span>
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {formatCurrency(d.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Haftalik: kalin bar chart */
                weeklyRevenueData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Bu ay icin ciro verisi yok</p>
                ) : (
                  <div className="aspect-[16/7] relative w-full flex items-end justify-around px-4 pb-8">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-border/20">
                      <div className="w-full h-px bg-border/10"></div>
                      <div className="w-full h-px bg-border/10"></div>
                      <div className="w-full h-px bg-border/10"></div>
                      <div className="w-full h-px bg-border/10"></div>
                    </div>
                    {weeklyRevenueData.map((w) => {
                      const heightPct = Math.max(5, (w.amount / maxWeeklyRevenue) * 90);
                      const isHighest = w.amount === maxWeeklyRevenue;
                      return (
                        <div key={w.label} className="relative group cursor-pointer h-full flex flex-col justify-end items-center" style={{ width: `${80 / weeklyRevenueData.length}%` }}>
                          <div
                            className={`w-full max-w-16 rounded-t-lg mx-auto transition-all ${isHighest ? 'bg-primary shadow-md shadow-primary/20' : 'bg-primary/20 group-hover:bg-primary/40'}`}
                            style={{ height: `${heightPct}%` }}
                          ></div>
                          <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${isHighest ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                            {w.label}
                          </span>
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {formatCurrency(w.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Right: Gider Kategorileri - recharts PieChart donut */}
            <div className="bg-card p-8 rounded-2xl shadow-xs border border-border/5">
              <h3 className="text-xl font-bold text-foreground mb-1">Gider Kategorileri</h3>
              <p className="text-sm text-muted-foreground mb-8">Dagilim Analizi</p>
              {categoryData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Bu ay icin gider verisi yok
                </p>
              ) : (
                <>
                  <div className="flex justify-center mb-8">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {categoryData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [formatCurrency(Number(value)), '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center pointer-events-none">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Toplam</p>
                        <p className="text-lg font-black text-foreground">{formatCompact(categoryTotal)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {categoryData.map((cat, index) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-foreground">{cat.name}</span>
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
            <section className="bg-card rounded-2xl shadow-xs border border-border/5 overflow-hidden">
              <div className="p-8 border-b border-border/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Gun Gun Gelir / Gider</h3>
                  <p className="text-sm text-muted-foreground">Son 30 gunluk detayli islem listesi</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-border/30 rounded-lg text-sm font-bold hover:bg-muted transition-colors">
                    <Filter className="size-4" />
                    Filtrele
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-border/30 rounded-lg text-sm font-bold hover:bg-muted transition-colors">
                    <Search className="size-4" />
                    Bul
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-wider">Tarih</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-wider">Ciro</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-wider">Gider</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-wider">Net Durum</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-wider">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {filteredBreakdown.map((d: any) => (
                      <tr key={d.day} className="hover:bg-muted transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{formatDateFull(d.day, selectedMonth)}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">{getDayName(d.day, selectedMonth)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-primary">
                            {d.revenue > 0 ? formatCurrency(d.revenue) : '\u2014'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-medium text-destructive">
                            {d.expense > 0 ? formatCurrency(d.expense) : '\u2014'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${d.net >= 0 ? 'bg-primary' : 'bg-destructive'}`} />
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(d.net)}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <button className="text-primary hover:underline text-sm font-bold">Incele</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="bg-muted border-t-2 border-border/20">
                      <td className="px-8 py-5 text-sm font-black text-foreground">Toplam</td>
                      <td className="px-8 py-5 text-sm font-bold text-primary">{formatCurrency(summary.totalRevenue)}</td>
                      <td className="px-8 py-5 text-sm font-medium text-destructive">{formatCurrency(summary.totalExpenses)}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${summary.netIncome >= 0 ? 'bg-primary' : 'bg-destructive'}`} />
                          <span className="text-sm font-bold text-foreground">{formatCurrency(summary.netIncome)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* Quick Action Floating Section */}
          <div className="mt-12 flex justify-center">
            <div className="bg-muted px-8 py-4 rounded-full flex items-center gap-8 shadow-xl">
              <Link href="/dashboard/finance/expenses" className="flex flex-col items-center gap-1 group">
                <Receipt className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-primary">Giderler</span>
              </Link>
              <div className="w-px h-8 bg-border/40" />
              <Link href="/dashboard/finance/revenues" className="flex flex-col items-center gap-1 group">
                <Monitor className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-primary">Cirolar</span>
              </Link>
              <div className="w-px h-8 bg-border/40" />
              <Link href="/dashboard/finance/expenses" className="flex flex-col items-center gap-1 group">
                <FileText className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground group-hover:text-primary">Vergi</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
