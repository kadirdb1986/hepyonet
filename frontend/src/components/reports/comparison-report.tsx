'use client';

import { useState } from 'react';
import { useComparisonReport } from '@/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maaş', BILL: 'Fatura', TAX: 'Vergi', RENT: 'Kira', SUPPLIER: 'Tedarikçi', OTHER: 'Diğer',
};

export function ComparisonReport() {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  const [periods, setPeriods] = useState<string[]>([prevMonthStr, currentMonth]);
  const [type, setType] = useState<'monthly' | 'weekly'>('monthly');
  const [queryPeriods, setQueryPeriods] = useState<string[] | null>(null);
  const [queryType, setQueryType] = useState<'monthly' | 'weekly'>('monthly');

  const { data: reports, isLoading, error } = useComparisonReport(queryPeriods, queryType);

  const handleAddPeriod = () => setPeriods((prev) => [...prev, '']);
  const handleRemovePeriod = (index: number) => { if (periods.length <= 2) return; setPeriods((prev) => prev.filter((_, i) => i !== index)); };
  const handlePeriodChange = (index: number, value: string) => { setPeriods((prev) => { const next = [...prev]; next[index] = value; return next; }); };
  const handleCompare = () => { const validPeriods = periods.filter((p) => p.trim() !== ''); if (validPeriods.length >= 2) { setQueryPeriods(validPeriods); setQueryType(type); } };

  const formatCurrency = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  const formatMargin = (revenue: number, expense: number, tax: number) => {
    if (revenue === 0) return '0%';
    return `${(((revenue - expense - tax) / revenue) * 100).toFixed(1)}%`;
  };

  const overviewChartData = reports?.map((r) => ({ period: r.period, Gelir: r.totalRevenue, Gider: r.totalExpense, Vergi: r.taxAmount, 'Net Kar': r.netProfit }));
  const marginChartData = reports?.map((r) => ({ period: r.period, 'Kar Marjı (%)': r.totalRevenue > 0 ? parseFloat((((r.totalRevenue - r.totalExpense - r.taxAmount) / r.totalRevenue) * 100).toFixed(1)) : 0 }));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label>Karsilastirma Turu</Label>
            <select className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={type} onChange={(e) => setType(e.target.value as 'monthly' | 'weekly')}>
              <option value="monthly">Aylık</option><option value="weekly">Haftalık</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Dönemler (en az 2)</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {periods.map((period, index) => (
              <div key={index} className="flex items-center gap-1">
                <Input type={type === 'monthly' ? 'month' : 'week'} value={period} onChange={(e) => handlePeriodChange(index, e.target.value)} className="w-48" />
                {periods.length > 2 && (<Button variant="ghost" size="icon" onClick={() => handleRemovePeriod(index)} className="h-8 w-8"><X className="h-4 w-4" /></Button>)}
              </div>
            ))}
            <Button variant="outline" size="icon" onClick={handleAddPeriod}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <Button onClick={handleCompare}>Karsilastir</Button>
      </div>
      {isLoading && (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Karsilastirma yukleniyor...</span></div>)}
      {error && (<div className="bg-destructive/10 text-destructive p-4 rounded-lg">Karsilastirma yuklenirken hata oluştu.</div>)}
      {reports && reports.length >= 2 && (
        <div className="space-y-8">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Gelir / Gider / Net Kar Karsilastirmasi</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={overviewChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /><Bar dataKey="Gelir" fill="#22c55e" /><Bar dataKey="Gider" fill="#ef4444" /><Bar dataKey="Vergi" fill="#f59e0b" /><Bar dataKey="Net Kar" fill="#3b82f6" /></BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Kar Marjı Trendi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={marginChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis unit="%" /><Tooltip formatter={(value) => `${value}%`} /><Legend /><Line type="monotone" dataKey="Kar Marjı (%)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 5 }} /></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Detayli Karsilastirma</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="sticky left-0 bg-background">Kalem</TableHead>{reports.map((r) => (<TableHead key={r.period} className="text-right">{r.period}</TableHead>))}</TableRow></TableHeader>
                <TableBody>
                  <TableRow className="bg-green-50"><TableCell className="sticky left-0 bg-green-50 font-medium">Toplam Gelir</TableCell>{reports.map((r) => (<TableCell key={r.period} className="text-right text-green-700 font-medium">{formatCurrency(r.totalRevenue)}</TableCell>))}</TableRow>
                  {['SALARY', 'BILL', 'TAX', 'RENT', 'SUPPLIER', 'OTHER'].map((cat) => (
                    <TableRow key={cat}><TableCell className="sticky left-0 bg-background">{CATEGORY_LABELS[cat]}</TableCell>{reports.map((r) => { const catData = r.expensesByCategory.find((e) => e.category === cat); return (<TableCell key={r.period} className="text-right">{formatCurrency(catData?.amount || 0)}</TableCell>); })}</TableRow>
                  ))}
                  <TableRow className="bg-red-50"><TableCell className="sticky left-0 bg-red-50 font-medium">Toplam Gider</TableCell>{reports.map((r) => (<TableCell key={r.period} className="text-right text-red-700 font-medium">{formatCurrency(r.totalExpense)}</TableCell>))}</TableRow>
                  <TableRow><TableCell className="sticky left-0 bg-background font-medium">Vergi</TableCell>{reports.map((r) => (<TableCell key={r.period} className="text-right">{formatCurrency(r.taxAmount)}</TableCell>))}</TableRow>
                  <TableRow className="border-t-2 font-bold"><TableCell className="sticky left-0 bg-background font-bold text-lg">Net Kar/Zarar</TableCell>{reports.map((r) => (<TableCell key={r.period} className={`text-right text-lg font-bold ${r.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(r.netProfit)}</TableCell>))}</TableRow>
                  <TableRow><TableCell className="sticky left-0 bg-background font-medium">Kar Marjı</TableCell>{reports.map((r) => (<TableCell key={r.period} className="text-right font-medium">{formatMargin(r.totalRevenue, r.totalExpense, r.taxAmount)}</TableCell>))}</TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
