'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2'];

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maaş',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikçi',
  OTHER: 'Diğer',
};

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function getDayName(day: number, month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  return DAY_NAMES[date.getDay()];
}

export default function FinanceOverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  return (
    <div>
      {/* Page header */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[#004253] font-bold tracking-widest text-[11px] uppercase mb-2 font-[family-name:var(--font-headline)]">Finansal Yönetim</p>
          <h1 className="text-4xl font-extrabold text-[#191c1d] tracking-tight mb-2 font-[family-name:var(--font-headline)]">Finans Özeti</h1>
          <p className="text-[#70787d] max-w-xl">Restoranınızın nakit akışını, günlük cirolarını ve gider dağılımlarını tek bir merkezden takip edin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month picker pill */}
          <div className="bg-[#f2f4f5] px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-[#70787d]">calendar_today</span>
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </Button>
            <span className="font-semibold text-[#40484c] min-w-[80px] text-center">{formatMonth(selectedMonth)}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Button>
          </div>

          {/* Navigation buttons */}
          <Link href="/dashboard/finance/expenses">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2f4f5] text-[#40484c] font-semibold text-sm hover:bg-[#e6e8e9] transition-colors">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              Giderler
            </button>
          </Link>
          <Link href="/dashboard/finance/revenues">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2f4f5] text-[#40484c] font-semibold text-sm hover:bg-[#e6e8e9] transition-colors">
              <span className="material-symbols-outlined text-lg">payments</span>
              Cirolar
            </button>
          </Link>
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
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {/* Toplam Ciro */}
            <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-[#bfc8cc]/10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-[#004253]">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
              </div>
              <p className="text-[#70787d] text-sm font-medium mb-1">Toplam Ciro</p>
              <h3 className="text-3xl font-black text-[#191c1d] font-[family-name:var(--font-headline)]">{formatCurrency(summary.totalRevenue)}</h3>
              <p className="text-xs text-[#70787d] mt-2">{summary.revenueCount} gün ciro girişi</p>
            </div>

            {/* Toplam Gider */}
            <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-[#bfc8cc]/10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-[#ba1a1a]">
                  <span className="material-symbols-outlined">trending_down</span>
                </div>
              </div>
              <p className="text-[#70787d] text-sm font-medium mb-1">Toplam Gider</p>
              <h3 className="text-3xl font-black text-[#191c1d] font-[family-name:var(--font-headline)]">{formatCurrency(summary.totalExpenses)}</h3>
              <p className="text-xs text-[#70787d] mt-2">{summary.directExpenses?.length || 0} gider kaydı</p>
            </div>

            {/* Net Gelir */}
            <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-[#bfc8cc]/10 ring-2 ring-[#004253]/5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#005b71] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
              </div>
              <p className="text-[#70787d] text-sm font-medium mb-1">Net Gelir</p>
              <h3 className="text-3xl font-black text-[#191c1d] font-[family-name:var(--font-headline)]">{formatCurrency(summary.netIncome)}</h3>
              <p className="text-xs text-[#70787d] mt-2">Ciro - Gider</p>
            </div>
          </div>

          {/* Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Günlük Ciro chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm ring-1 ring-[#bfc8cc]/10">
              <h2 className="text-xl font-bold text-[#191c1d] font-[family-name:var(--font-headline)]">Günlük Ciro</h2>
              <p className="text-sm text-[#70787d] mb-6">Aylık ciro dağılımı</p>
              {summary.dailyRevenues.length === 0 ? (
                <p className="text-[#70787d] text-sm text-center py-8">
                  Bu ay için ciro verisi yok
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={summary.dailyRevenues.map((r: any) => ({
                      date: new Date(r.date).getDate().toString(),
                      amount: r.amount,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        'Ciro',
                      ]}
                    />
                    <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Gider Kategorileri chart */}
            <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-[#bfc8cc]/10">
              <h2 className="text-xl font-bold text-[#191c1d] font-[family-name:var(--font-headline)]">Gider Kategorileri</h2>
              <p className="text-sm text-[#70787d] mb-6">Kategori bazlı dağılım</p>
              {categoryData.length === 0 ? (
                <p className="text-[#70787d] text-sm text-center py-8">
                  Bu ay için gider verisi yok
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gün Gün Gelir/Gider Tablosu */}
          {summary.dailyBreakdown && summary.dailyBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-[#bfc8cc]/10 overflow-hidden">
              <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
                <div>
                  <h2 className="text-xl font-bold text-[#191c1d] font-[family-name:var(--font-headline)]">Gün Gün Gelir / Gider</h2>
                  <p className="text-sm text-[#70787d]">Günlük detaylı gelir ve gider karşılaştırması</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f2f4f5]">
                      <th className="text-left px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Gün</th>
                      <th className="text-right px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Ciro</th>
                      <th className="text-right px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Gider</th>
                      <th className="text-right px-8 py-4 text-[10px] font-black uppercase text-[#70787d] tracking-wider">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.dailyBreakdown
                      .filter((d: any) => d.revenue > 0 || d.expense > 0)
                      .map((d: any) => (
                        <tr key={d.day} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="font-bold text-[#191c1d]">{d.day} {formatMonth(selectedMonth)}</div>
                            <div className="text-[10px] uppercase text-[#70787d] tracking-wider mt-0.5">{getDayName(d.day, selectedMonth)}</div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="text-sm font-bold text-teal-700">
                              {d.revenue > 0 ? formatCurrency(d.revenue) : '—'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="text-sm font-medium text-[#ba1a1a]">
                              {d.expense > 0 ? formatCurrency(d.expense) : '—'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                              <span className={`w-2 h-2 rounded-full ${d.net >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={d.net >= 0 ? 'text-green-700' : 'text-red-600'}>
                                {formatCurrency(d.net)}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-[#f2f4f5]">
                      <td className="px-8 py-5 font-black text-[#191c1d]">Toplam</td>
                      <td className="px-8 py-5 text-right text-sm font-bold text-teal-700">{formatCurrency(summary.totalRevenue)}</td>
                      <td className="px-8 py-5 text-right text-sm font-medium text-[#ba1a1a]">{formatCurrency(summary.totalExpenses)}</td>
                      <td className="px-8 py-5 text-right">
                        <span className="inline-flex items-center gap-1.5 font-bold text-sm">
                          <span className={`w-2 h-2 rounded-full ${summary.netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={summary.netIncome >= 0 ? 'text-green-700' : 'text-red-600'}>
                            {formatCurrency(summary.netIncome)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
