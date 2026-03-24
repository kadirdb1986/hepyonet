import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { GenerateReportDto } from './dto/generate-report.dto';

export interface ExpenseByCategoryItem {
  category: string;
  amount: number;
  items: Array<{
    id: string;
    title: string;
    amount: number;
    paymentDate: Date;
    isDistributed: boolean;
  }>;
}

export interface RevenueItem {
  id: string;
  date: Date;
  amount: number;
  source: string;
  notes: string | null;
}

export interface ReportData {
  period: string;
  periodType: 'monthly' | 'weekly';
  revenues: RevenueItem[];
  totalRevenue: number;
  expensesByCategory: ExpenseByCategoryItem[];
  totalExpense: number;
  taxAmount: number;
  netProfit: number;
}

@Injectable()
export class ReportService {
  private reportTemplate: Handlebars.TemplateDelegate;

  constructor(private prisma: PrismaService) {
    const templatePath = path.join(__dirname, 'templates', 'report.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    this.reportTemplate = Handlebars.compile(templateSource);

    Handlebars.registerHelper('formatCurrency', (value: number) => {
      return new Handlebars.SafeString(
        value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
      );
    });

    Handlebars.registerHelper('editedMarker', (isEdited: boolean) => {
      if (isEdited) {
        return new Handlebars.SafeString(
          '<span class="edited-marker" title="Elle duzeltildi">&#9998; elle duzeltildi</span>',
        );
      }
      return '';
    });

    Handlebars.registerHelper('ifEquals', function (
      this: unknown,
      arg1: unknown,
      arg2: unknown,
      options: Handlebars.HelperOptions,
    ) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });
  }

  private decimalToNumber(val: { toString(): string }): number {
    return parseFloat(val.toString());
  }

  private getMonthDateRange(month: string): { start: Date; end: Date } {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private getWeekDateRange(week: string): { start: Date; end: Date } {
    const [yearStr, weekStr] = week.split('-W');
    const year = parseInt(yearStr, 10);
    const weekNum = parseInt(weekStr, 10);
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (dayOfWeek - 1));
    const start = new Date(mondayOfWeek1);
    start.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async getMonthlyReport(restaurantId: string, month: string): Promise<ReportData> {
    const { start, end } = this.getMonthDateRange(month);
    return this.getReportForPeriod(restaurantId, month, 'monthly', start, end);
  }

  async getWeeklyReport(restaurantId: string, week: string): Promise<ReportData> {
    const { start, end } = this.getWeekDateRange(week);
    return this.getReportForPeriod(restaurantId, week, 'weekly', start, end);
  }

  private async getReportForPeriod(
    restaurantId: string,
    period: string,
    periodType: 'monthly' | 'weekly',
    start: Date,
    end: Date,
  ): Promise<ReportData> {
    const revenues = await this.prisma.revenue.findMany({
      where: { restaurantId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const revenueItems: RevenueItem[] = revenues.map((r) => ({
      id: r.id,
      date: r.date,
      amount: this.decimalToNumber(r.amount),
      source: r.source,
      notes: r.notes,
    }));

    const totalRevenue = revenueItems.reduce((sum, r) => sum + r.amount, 0);

    const directExpenses = await this.prisma.expense.findMany({
      where: { restaurantId, isDistributed: false, paymentDate: { gte: start, lte: end } },
      include: { category: true },
    });

    let distributedExpenseItems: Array<{
      id: string; title: string; amount: number; category: string; paymentDate: Date; isDistributed: boolean;
    }> = [];

    if (periodType === 'monthly') {
      const distributions = await this.prisma.expenseDistribution.findMany({
        where: { month: period, expense: { restaurantId } },
        include: { expense: { include: { category: true } } },
      });
      distributedExpenseItems = distributions.map((d) => ({
        id: d.expense.id, title: d.expense.title,
        amount: this.decimalToNumber(d.amount), category: d.expense.category?.name || 'Diğer',
        paymentDate: d.expense.paymentDate, isDistributed: true,
      }));
    } else {
      const monthsInRange = this.getMonthsInRange(start, end);
      for (const m of monthsInRange) {
        const distributions = await this.prisma.expenseDistribution.findMany({
          where: { month: m, expense: { restaurantId } },
          include: { expense: { include: { category: true } } },
        });
        const { start: monthStart, end: monthEnd } = this.getMonthDateRange(m);
        const daysInMonth = Math.floor((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const overlapStart = start > monthStart ? start : monthStart;
        const overlapEnd = end < monthEnd ? end : monthEnd;
        const overlapDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const ratio = overlapDays / daysInMonth;
        for (const d of distributions) {
          distributedExpenseItems.push({
            id: d.expense.id, title: d.expense.title,
            amount: parseFloat((this.decimalToNumber(d.amount) * ratio).toFixed(2)),
            category: d.expense.category?.name || 'Diğer', paymentDate: d.expense.paymentDate, isDistributed: true,
          });
        }
      }
    }

    const allExpenseItems = [
      ...directExpenses.map((e) => ({
        id: e.id, title: e.title, amount: this.decimalToNumber(e.amount),
        category: (e as any).category?.name || 'Diğer', paymentDate: e.paymentDate, isDistributed: false,
      })),
      ...distributedExpenseItems,
    ];

    const categoryOrder = ['SALARY', 'BILL', 'TAX', 'RENT', 'SUPPLIER', 'OTHER'];
    const categoryMap = new Map<string, { amount: number; items: Array<{ id: string; title: string; amount: number; paymentDate: Date; isDistributed: boolean }> }>();
    for (const cat of categoryOrder) { categoryMap.set(cat, { amount: 0, items: [] }); }
    for (const item of allExpenseItems) {
      const entry = categoryMap.get(item.category);
      if (entry) {
        entry.amount += item.amount;
        entry.items.push({ id: item.id, title: item.title, amount: item.amount, paymentDate: item.paymentDate, isDistributed: item.isDistributed });
      }
    }

    const expensesByCategory: ExpenseByCategoryItem[] = categoryOrder.map((cat) => {
      const entry = categoryMap.get(cat)!;
      return { category: cat, amount: parseFloat(entry.amount.toFixed(2)), items: entry.items };
    });

    const totalExpense = parseFloat(expensesByCategory.reduce((sum, c) => sum + c.amount, 0).toFixed(2));
    const taxRate = 0.20;
    const taxAmount = parseFloat((totalRevenue * taxRate).toFixed(2));
    const netProfit = parseFloat((totalRevenue - totalExpense - taxAmount).toFixed(2));

    return {
      period, periodType, revenues: revenueItems,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      expensesByCategory, totalExpense, taxAmount, netProfit,
    };
  }

  private getMonthsInRange(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (current <= endMonth) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }

  async getComparison(
    restaurantId: string, periods: string[], type: 'monthly' | 'weekly' = 'monthly',
  ): Promise<ReportData[]> {
    const reports: ReportData[] = [];
    for (const period of periods) {
      if (type === 'monthly') {
        reports.push(await this.getMonthlyReport(restaurantId, period));
      } else {
        reports.push(await this.getWeeklyReport(restaurantId, period));
      }
    }
    return reports;
  }

  async generateReport(dto: GenerateReportDto): Promise<{ content: Buffer | string; contentType: string }> {
    const categoryLabels: Record<string, string> = {
      SALARY: 'Maas', BILL: 'Fatura', TAX: 'Vergi', RENT: 'Kira', SUPPLIER: 'Tedarikci', OTHER: 'Diger',
    };
    const periodLabel = dto.periodType === 'monthly' ? `Aylik Rapor: ${dto.period}` : `Haftalik Rapor: ${dto.period}`;
    const templateData = {
      restaurantName: dto.restaurantName, periodLabel, period: dto.period, periodType: dto.periodType,
      revenues: dto.revenues, totalRevenue: dto.totalRevenue, totalRevenueEdited: dto.totalRevenueEdited,
      expenses: dto.expenses.map((e) => ({ ...e, categoryLabel: categoryLabels[e.category] || e.category })),
      totalExpense: dto.totalExpense, totalExpenseEdited: dto.totalExpenseEdited,
      taxAmount: dto.taxAmount, taxEdited: dto.taxEdited,
      netProfit: dto.netProfit, netProfitEdited: dto.netProfitEdited,
      isProfit: dto.netProfit >= 0, generatedAt: new Date().toLocaleString('tr-TR'),
    };

    const html = this.reportTemplate(templateData);

    if (dto.format === 'html') {
      return { content: html, contentType: 'text/html' };
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4', printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return { content: Buffer.from(pdfBuffer), contentType: 'application/pdf' };
    } finally {
      await browser.close();
    }
  }
}
