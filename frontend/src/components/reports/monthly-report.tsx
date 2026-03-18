'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMonthlyReport, useGenerateReport } from '@/hooks/use-reports';
import { useAuth } from '@/hooks/use-auth';
import { ReportTable } from './report-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, FileDown } from 'lucide-react';
import { toast } from 'sonner';

export function MonthlyReport() {
  const currentDate = new Date();
  const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [queryMonth, setQueryMonth] = useState<string | null>(null);
  const [format, setFormat] = useState<'pdf' | 'html'>('pdf');
  const [revenueEdits, setRevenueEdits] = useState<Map<number, number>>(new Map());
  const [expenseEdits, setExpenseEdits] = useState<Map<string, number>>(new Map());
  const [taxEdit, setTaxEdit] = useState<number | null>(null);

  const { data: report, isLoading, error } = useMonthlyReport(queryMonth);
  const generateReport = useGenerateReport();
  const { user, activeMembership } = useAuth();

  const resetEdits = useCallback(() => { setRevenueEdits(new Map()); setExpenseEdits(new Map()); setTaxEdit(null); }, []);
  const handleFetchReport = () => { resetEdits(); setQueryMonth(selectedMonth); };
  const handleRevenueEdit = (index: number, value: number) => { setRevenueEdits((prev) => { const next = new Map(prev); next.set(index, value); return next; }); };
  const handleExpenseEdit = (category: string, value: number) => { setExpenseEdits((prev) => { const next = new Map(prev); next.set(category, value); return next; }); };
  const handleTaxEdit = (value: number) => { setTaxEdit(value); };

  const computedValues = useMemo(() => {
    if (!report) return null;
    let totalRevenue = 0;
    const revenues = report.revenues.map((rev, index) => {
      const editedAmount = revenueEdits.get(index);
      const amount = editedAmount !== undefined ? editedAmount : rev.amount;
      totalRevenue += amount;
      return { ...rev, date: typeof rev.date === 'string' ? rev.date : new Date(rev.date).toISOString().split('T')[0], originalAmount: rev.amount, amount, isEdited: editedAmount !== undefined && editedAmount !== rev.amount };
    });
    const totalRevenueEdited = totalRevenue !== report.totalRevenue;
    let totalExpense = 0;
    const expenses = report.expensesByCategory.map((exp) => {
      const editedAmount = expenseEdits.get(exp.category);
      const amount = editedAmount !== undefined ? editedAmount : exp.amount;
      totalExpense += amount;
      return { category: exp.category, originalAmount: exp.amount, amount, isEdited: editedAmount !== undefined && editedAmount !== exp.amount };
    });
    const totalExpenseEdited = totalExpense !== report.totalExpense;
    const currentTax = taxEdit !== null ? taxEdit : report.taxAmount;
    const taxEdited = currentTax !== report.taxAmount;
    const netProfit = parseFloat((totalRevenue - totalExpense - currentTax).toFixed(2));
    const netProfitEdited = totalRevenueEdited || totalExpenseEdited || taxEdited;
    return { revenues, totalRevenue: parseFloat(totalRevenue.toFixed(2)), totalRevenueEdited, expenses, totalExpense: parseFloat(totalExpense.toFixed(2)), totalExpenseEdited, taxAmount: currentTax, taxEdited, netProfit, netProfitEdited };
  }, [report, revenueEdits, expenseEdits, taxEdit]);

  const handleGenerate = () => {
    if (!report || !computedValues || !activeMembership) return;
    generateReport.mutate({
      period: report.period, periodType: 'monthly', restaurantName: activeMembership.restaurantName,
      totalRevenue: computedValues.totalRevenue, totalRevenueEdited: computedValues.totalRevenueEdited,
      revenues: computedValues.revenues, expenses: computedValues.expenses,
      totalExpense: computedValues.totalExpense, totalExpenseEdited: computedValues.totalExpenseEdited,
      taxAmount: computedValues.taxAmount, taxEdited: computedValues.taxEdited,
      netProfit: computedValues.netProfit, netProfitEdited: computedValues.netProfitEdited, format,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2"><Label htmlFor="month-input">Ay</Label><Input id="month-input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-48" /></div>
        <Button onClick={handleFetchReport}>Raporu Getir</Button>
      </div>
      {isLoading && (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Rapor yukleniyor...</span></div>)}
      {error && (<div className="bg-destructive/10 text-destructive p-4 rounded-lg">Rapor yuklenirken hata oluştu.</div>)}
      {report && computedValues && (
        <>
          <ReportTable revenues={report.revenues} revenueEdits={revenueEdits} onRevenueEdit={handleRevenueEdit}
            expensesByCategory={report.expensesByCategory} expenseEdits={expenseEdits} onExpenseEdit={handleExpenseEdit}
            totalRevenue={computedValues.totalRevenue} totalExpense={computedValues.totalExpense}
            taxAmount={computedValues.taxAmount} originalTaxAmount={report.taxAmount} onTaxEdit={handleTaxEdit} netProfit={computedValues.netProfit} />
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Cikti Formati</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={format} onChange={(e) => setFormat(e.target.value as 'pdf' | 'html')}>
                <option value="pdf">PDF</option><option value="html">HTML</option>
              </select>
            </div>
            <Button onClick={handleGenerate} disabled={generateReport.isPending} className="mt-auto" size="lg">
              {generateReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : format === 'pdf' ? <FileDown className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Raporla
            </Button>
            {(revenueEdits.size > 0 || expenseEdits.size > 0 || taxEdit !== null) && (
              <Button variant="outline" onClick={resetEdits} className="mt-auto">Duzeltmeleri Sifirla</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
