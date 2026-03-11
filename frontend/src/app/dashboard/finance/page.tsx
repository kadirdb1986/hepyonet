'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  DollarSign,
  Receipt,
  PieChart,
} from 'lucide-react';
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
  SALARY: 'Maas',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikci',
  OTHER: 'Diger',
};

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export default function FinanceOverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

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
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finans Ozeti</h1>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/finance/expenses">
          <Button variant="outline" className="gap-2">
            <Receipt className="h-4 w-4" />
            Giderler
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/dashboard/finance/revenues">
          <Button variant="outline" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Cirolar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/dashboard/finance/distribute">
          <Button variant="outline" className="gap-2">
            <PieChart className="h-4 w-4" />
            Gider Dagitimi
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Yukleniyor...</p>
        </div>
      ) : !summary ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Bu ay icin veri bulunamadi</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Toplam Ciro
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalRevenue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.revenueCount} gun ciro girisi
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Toplam Gider
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpenses)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dogrudan: {formatCurrency(summary.totalDirectExpenses)} | Dagitilan: {formatCurrency(summary.totalDistributedExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Net Gelir
                </CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(summary.netIncome)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ciro - Gider
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gunluk Ciro</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.dailyRevenues.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Bu ay icin ciro verisi yok
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gider Kategorileri</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Bu ay icin gider verisi yok
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
              </CardContent>
            </Card>
          </div>

          {summary.distributedExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Bu Aya Dagitilan Giderler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Gider</th>
                        <th className="text-left py-2 px-3 font-medium">Kategori</th>
                        <th className="text-right py-2 px-3 font-medium">Orijinal Tutar</th>
                        <th className="text-right py-2 px-3 font-medium">Bu Aya Dusen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.distributedExpenses.map((d: any) => (
                        <tr key={d.id} className="border-b last:border-0">
                          <td className="py-2 px-3">{d.title}</td>
                          <td className="py-2 px-3">
                            {CATEGORY_LABELS[d.category] || d.category}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatCurrency(d.originalAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(d.distributedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
