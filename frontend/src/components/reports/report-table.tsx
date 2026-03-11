'use client';

import { EditableCell } from './editable-cell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maas', BILL: 'Fatura', TAX: 'Vergi', RENT: 'Kira', SUPPLIER: 'Tedarikci', OTHER: 'Diger',
};

interface ReportTableProps {
  revenues: Array<{ id: string; date: string | Date; amount: number; notes: string | null }>;
  revenueEdits: Map<number, number>;
  onRevenueEdit: (index: number, value: number) => void;
  expensesByCategory: Array<{ category: string; amount: number }>;
  expenseEdits: Map<string, number>;
  onExpenseEdit: (category: string, value: number) => void;
  totalRevenue: number;
  totalExpense: number;
  taxAmount: number;
  originalTaxAmount: number;
  onTaxEdit: (value: number) => void;
  netProfit: number;
}

export function ReportTable({
  revenues, revenueEdits, onRevenueEdit, expensesByCategory, expenseEdits, onExpenseEdit,
  totalRevenue, totalExpense, taxAmount, originalTaxAmount, onTaxEdit, netProfit,
}: ReportTableProps) {
  const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('tr-TR');
  const formatCurrency = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-green-700 border-b pb-2">Gelirler (Ciro)</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead>Not</TableHead></TableRow></TableHeader>
            <TableBody>
              {revenues.map((rev, index) => {
                const editedAmount = revenueEdits.get(index);
                const currentAmount = editedAmount !== undefined ? editedAmount : rev.amount;
                return (
                  <TableRow key={rev.id || index}>
                    <TableCell>{formatDate(rev.date)}</TableCell>
                    <TableCell className="text-right"><EditableCell value={currentAmount} originalValue={rev.amount} onChange={(val) => onRevenueEdit(index, val)} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{rev.notes || '-'}</TableCell>
                  </TableRow>
                );
              })}
              {revenues.length === 0 && (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Bu donem icin gelir kaydi bulunamadi</TableCell></TableRow>)}
              <TableRow className="bg-green-50 font-bold"><TableCell>Toplam Gelir</TableCell><TableCell className="text-right text-green-700">{formatCurrency(totalRevenue)}</TableCell><TableCell /></TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b pb-2">Giderler</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
            <TableBody>
              {expensesByCategory.map((exp) => {
                const editedAmount = expenseEdits.get(exp.category);
                const currentAmount = editedAmount !== undefined ? editedAmount : exp.amount;
                return (
                  <TableRow key={exp.category}>
                    <TableCell>{CATEGORY_LABELS[exp.category] || exp.category}</TableCell>
                    <TableCell className="text-right"><EditableCell value={currentAmount} originalValue={exp.amount} onChange={(val) => onExpenseEdit(exp.category, val)} /></TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-red-50 font-bold"><TableCell>Toplam Gider</TableCell><TableCell className="text-right text-red-700">{formatCurrency(totalExpense)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="bg-muted/30 border rounded-lg p-6 space-y-3">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Ozet</h3>
        <div className="flex justify-between items-center py-2"><span className="font-medium">Toplam Gelir</span><span className="text-green-700 font-semibold">{formatCurrency(totalRevenue)}</span></div>
        <div className="flex justify-between items-center py-2"><span className="font-medium">Toplam Gider</span><span className="text-red-700 font-semibold">{formatCurrency(totalExpense)}</span></div>
        <div className="flex justify-between items-center py-2"><span className="font-medium">Vergi (KDV %20)</span><EditableCell value={taxAmount} originalValue={originalTaxAmount} onChange={onTaxEdit} /></div>
        <div className="flex justify-between items-center py-3 border-t-2 border-foreground mt-2">
          <span className="text-xl font-bold">Net Kar/Zarar</span>
          <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(netProfit)}</span>
        </div>
      </div>
    </div>
  );
}
