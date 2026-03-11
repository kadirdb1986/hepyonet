'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export interface RevenueItem {
  id: string;
  date: string;
  amount: number;
  source: string;
  notes: string | null;
}

export interface ExpenseCategoryItem {
  category: string;
  amount: number;
  items: Array<{
    id: string;
    title: string;
    amount: number;
    paymentDate: string;
    isDistributed: boolean;
  }>;
}

export interface ReportData {
  period: string;
  periodType: 'monthly' | 'weekly';
  revenues: RevenueItem[];
  totalRevenue: number;
  expensesByCategory: ExpenseCategoryItem[];
  totalExpense: number;
  taxAmount: number;
  netProfit: number;
}

export interface EditedReportExpense {
  category: string;
  originalAmount: number;
  amount: number;
  isEdited: boolean;
}

export interface EditedReportRevenue {
  date: string;
  originalAmount: number;
  amount: number;
  isEdited: boolean;
  notes?: string | null;
}

export interface GenerateReportPayload {
  period: string;
  periodType: 'monthly' | 'weekly';
  restaurantName: string;
  totalRevenue: number;
  totalRevenueEdited: boolean;
  revenues: EditedReportRevenue[];
  expenses: EditedReportExpense[];
  totalExpense: number;
  totalExpenseEdited: boolean;
  taxAmount: number;
  taxEdited: boolean;
  netProfit: number;
  netProfitEdited: boolean;
  format: 'pdf' | 'html';
}

export function useMonthlyReport(month: string | null) {
  return useQuery<ReportData>({
    queryKey: ['report', 'monthly', month],
    queryFn: () => api.get(`/reports/monthly?month=${month}`).then((r) => r.data),
    enabled: !!month,
  });
}

export function useWeeklyReport(week: string | null) {
  return useQuery<ReportData>({
    queryKey: ['report', 'weekly', week],
    queryFn: () => api.get(`/reports/weekly?week=${week}`).then((r) => r.data),
    enabled: !!week,
  });
}

export function useComparisonReport(periods: string[] | null, type: 'monthly' | 'weekly' = 'monthly') {
  const periodsParam = periods?.join(',');
  return useQuery<ReportData[]>({
    queryKey: ['report', 'compare', periodsParam, type],
    queryFn: () => api.get(`/reports/compare?periods=${periodsParam}&type=${type}`).then((r) => r.data),
    enabled: !!periods && periods.length >= 2,
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: async (payload: GenerateReportPayload) => {
      const response = await api.post('/reports/generate', payload, {
        responseType: payload.format === 'pdf' ? 'blob' : 'text',
      });
      if (payload.format === 'pdf') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapor-${payload.period}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(response.data);
          newWindow.document.close();
        }
      }
      return response.data;
    },
  });
}
