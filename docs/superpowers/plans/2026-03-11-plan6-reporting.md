# Plan 6: Reporting Module — Monthly, Weekly, Comparison Reports + PDF/HTML Generation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reporting module — monthly and weekly financial reports, period comparison with charts, editable report view (frontend-only edits, not persisted to DB), and PDF/HTML report generation via Puppeteer.

**Architecture:** Backend aggregates Revenue, Expense, and ExpenseDistribution data per period, calculates tax and net profit. Frontend displays an editable report view. Users can modify any value before generating output. Edited values are sent to the backend which renders a styled HTML template and converts it to PDF using Puppeteer.

**Tech Stack:** NestJS (backend), Next.js (frontend), Prisma, Puppeteer (HTML-to-PDF), Recharts (comparison charts), Tailwind CSS, shadcn/ui, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-11-hepyonet-design.md`

**Note on testing:** E2e and unit tests are deferred to a separate testing plan to keep this plan focused. Test file paths are not listed in the file structure.

**Note on editable reports:** Users can edit any value on the report screen. Edits are tracked purely in frontend state and are NOT written back to the database. Edited fields display a pencil icon. When the user clicks "Raporla", the current values (including edits) are sent to the backend for PDF/HTML generation. The generated output marks edited fields with "elle duzeltildi".

**Prerequisites:**
- Plan 1: Foundation (auth, guards, decorators, PrismaModule)
- Plan 3: Finance Module (Expense, Revenue, ExpenseDistribution CRUD — must be implemented)

**Related Plans:**
- Plan 1: Foundation
- Plan 3: Finance Module
- Plan 4: Inventory + Product/Recipe Module
- Plan 5: Menu + QR Menu Module

**Roles with access:** ADMIN, ACCOUNTANT

---

## File Structure

```
hepyonet/
├── backend/
│   └── src/
│       └── report/
│           ├── report.module.ts
│           ├── report.controller.ts
│           ├── report.service.ts
│           ├── dto/
│           │   ├── report-query.dto.ts
│           │   └── generate-report.dto.ts
│           └── templates/
│               └── report.hbs
├── frontend/
│   └── src/
│       ├── app/
│       │   └── dashboard/
│       │       └── reports/
│       │           └── page.tsx
│       ├── components/
│       │   └── reports/
│       │       ├── monthly-report.tsx
│       │       ├── weekly-report.tsx
│       │       ├── comparison-report.tsx
│       │       ├── report-table.tsx
│       │       └── editable-cell.tsx
│       └── hooks/
│           └── use-reports.ts
```

---

## Chunk 1: Backend — Report Module Setup + Dependencies

### Task 1: Install Puppeteer and Handlebars in backend

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install puppeteer and handlebars**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm install puppeteer handlebars
```

Puppeteer is used for HTML-to-PDF rendering. Handlebars is used for the report HTML template.

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "feat: install puppeteer and handlebars for report generation"
```

---

### Task 2: Create Report DTOs

**Files:**
- Create: `backend/src/report/dto/report-query.dto.ts`
- Create: `backend/src/report/dto/generate-report.dto.ts`

- [ ] **Step 1: Write ReportQueryDto and CompareQueryDto**

```typescript
// backend/src/report/dto/report-query.dto.ts
import { IsString, Matches, IsOptional } from 'class-validator';

export class MonthlyReportQueryDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month: string; // YYYY-MM
}

export class WeeklyReportQueryDto {
  @IsString()
  @Matches(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, {
    message: 'week must be in YYYY-WXX format',
  })
  week: string; // YYYY-WXX
}

export class CompareQueryDto {
  @IsString()
  periods: string; // comma-separated: "YYYY-MM,YYYY-MM" or "YYYY-WXX,YYYY-WXX"

  @IsOptional()
  @IsString()
  type?: 'monthly' | 'weekly'; // defaults to 'monthly'
}
```

- [ ] **Step 2: Write GenerateReportDto**

```typescript
// backend/src/report/dto/generate-report.dto.ts
import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportExpenseItemDto {
  @IsString()
  category: string;

  @IsNumber()
  originalAmount: number;

  @IsNumber()
  amount: number;

  @IsBoolean()
  isEdited: boolean;
}

export class ReportRevenueItemDto {
  @IsString()
  date: string;

  @IsNumber()
  originalAmount: number;

  @IsNumber()
  amount: number;

  @IsBoolean()
  isEdited: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateReportDto {
  @IsString()
  period: string; // YYYY-MM or YYYY-WXX

  @IsString()
  periodType: 'monthly' | 'weekly';

  @IsString()
  restaurantName: string;

  @IsNumber()
  totalRevenue: number;

  @IsBoolean()
  totalRevenueEdited: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportRevenueItemDto)
  revenues: ReportRevenueItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportExpenseItemDto)
  expenses: ReportExpenseItemDto[];

  @IsNumber()
  totalExpense: number;

  @IsBoolean()
  totalExpenseEdited: boolean;

  @IsNumber()
  taxAmount: number;

  @IsBoolean()
  taxEdited: boolean;

  @IsNumber()
  netProfit: number;

  @IsBoolean()
  netProfitEdited: boolean;

  @IsString()
  format: 'pdf' | 'html';
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/report/dto/
git commit -m "feat: add report query and generation DTOs"
```

---

### Task 3: Create Report Service

**Files:**
- Create: `backend/src/report/report.service.ts`

- [ ] **Step 1: Write ReportService**

```typescript
// backend/src/report/report.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { GenerateReportDto } from './dto/generate-report.dto';

interface ExpenseByCategoryItem {
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

interface RevenueItem {
  id: string;
  date: Date;
  amount: number;
  source: string;
  notes: string | null;
}

interface ReportData {
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
    const templatePath = path.join(
      __dirname,
      'templates',
      'report.hbs',
    );
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    this.reportTemplate = Handlebars.compile(templateSource);

    Handlebars.registerHelper('formatCurrency', (value: number) => {
      return new Handlebars.SafeString(
        value.toLocaleString('tr-TR', {
          style: 'currency',
          currency: 'TRY',
        }),
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

  private decimalToNumber(val: Decimal): number {
    return parseFloat(val.toString());
  }

  private getMonthDateRange(month: string): { start: Date; end: Date } {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private getWeekDateRange(week: string): { start: Date; end: Date } {
    // week format: YYYY-WXX
    const [yearStr, weekStr] = week.split('-W');
    const year = parseInt(yearStr, 10);
    const weekNum = parseInt(weekStr, 10);

    // ISO 8601: Week 1 is the week containing the first Thursday of the year
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // Convert Sunday (0) to 7
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (dayOfWeek - 1));

    const start = new Date(mondayOfWeek1);
    start.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  async getMonthlyReport(
    restaurantId: string,
    month: string,
  ): Promise<ReportData> {
    const { start, end } = this.getMonthDateRange(month);
    return this.getReportForPeriod(restaurantId, month, 'monthly', start, end);
  }

  async getWeeklyReport(
    restaurantId: string,
    week: string,
  ): Promise<ReportData> {
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
    // 1. Fetch revenues for the period
    const revenues = await this.prisma.revenue.findMany({
      where: {
        restaurantId,
        date: { gte: start, lte: end },
      },
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

    // 2. Fetch non-distributed expenses for the period (paymentDate in range)
    const directExpenses = await this.prisma.expense.findMany({
      where: {
        restaurantId,
        isDistributed: false,
        paymentDate: { gte: start, lte: end },
      },
    });

    // 3. Fetch distributed expense amounts for this period
    // For monthly reports, match on the month string directly
    // For weekly reports, we need to find distributions whose month overlaps with the week
    let distributedExpenseItems: Array<{
      id: string;
      title: string;
      amount: number;
      category: string;
      paymentDate: Date;
      isDistributed: boolean;
    }> = [];

    if (periodType === 'monthly') {
      const distributions = await this.prisma.expenseDistribution.findMany({
        where: { month, expense: { restaurantId } },
        include: { expense: true },
      });

      distributedExpenseItems = distributions.map((d) => ({
        id: d.expense.id,
        title: d.expense.title,
        amount: this.decimalToNumber(d.amount),
        category: d.expense.category,
        paymentDate: d.expense.paymentDate,
        isDistributed: true,
      }));
    } else {
      // For weekly: find distributions in the month(s) that overlap this week,
      // then prorate by days in week / days in month
      const monthsInRange = this.getMonthsInRange(start, end);
      for (const m of monthsInRange) {
        const distributions =
          await this.prisma.expenseDistribution.findMany({
            where: { month: m, expense: { restaurantId } },
            include: { expense: true },
          });

        const { start: monthStart, end: monthEnd } =
          this.getMonthDateRange(m);
        const daysInMonth =
          Math.floor(
            (monthEnd.getTime() - monthStart.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;

        const overlapStart = start > monthStart ? start : monthStart;
        const overlapEnd = end < monthEnd ? end : monthEnd;
        const overlapDays =
          Math.floor(
            (overlapEnd.getTime() - overlapStart.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;

        const ratio = overlapDays / daysInMonth;

        for (const d of distributions) {
          distributedExpenseItems.push({
            id: d.expense.id,
            title: d.expense.title,
            amount: parseFloat((this.decimalToNumber(d.amount) * ratio).toFixed(2)),
            category: d.expense.category,
            paymentDate: d.expense.paymentDate,
            isDistributed: true,
          });
        }
      }
    }

    // 4. Combine direct + distributed expenses and group by category
    const allExpenseItems = [
      ...directExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: this.decimalToNumber(e.amount),
        category: e.category,
        paymentDate: e.paymentDate,
        isDistributed: false,
      })),
      ...distributedExpenseItems,
    ];

    const categoryOrder = [
      'SALARY',
      'BILL',
      'TAX',
      'RENT',
      'SUPPLIER',
      'OTHER',
    ];

    const categoryMap = new Map<
      string,
      {
        amount: number;
        items: Array<{
          id: string;
          title: string;
          amount: number;
          paymentDate: Date;
          isDistributed: boolean;
        }>;
      }
    >();

    for (const cat of categoryOrder) {
      categoryMap.set(cat, { amount: 0, items: [] });
    }

    for (const item of allExpenseItems) {
      const entry = categoryMap.get(item.category);
      if (entry) {
        entry.amount += item.amount;
        entry.items.push({
          id: item.id,
          title: item.title,
          amount: item.amount,
          paymentDate: item.paymentDate,
          isDistributed: item.isDistributed,
        });
      }
    }

    const expensesByCategory: ExpenseByCategoryItem[] = categoryOrder.map(
      (cat) => {
        const entry = categoryMap.get(cat)!;
        return {
          category: cat,
          amount: parseFloat(entry.amount.toFixed(2)),
          items: entry.items,
        };
      },
    );

    const totalExpense = parseFloat(
      expensesByCategory
        .reduce((sum, c) => sum + c.amount, 0)
        .toFixed(2),
    );

    // 5. Auto-calculate tax (simplified: 20% KDV on revenue)
    const taxRate = 0.20;
    const taxAmount = parseFloat((totalRevenue * taxRate).toFixed(2));

    // 6. Net profit/loss
    const netProfit = parseFloat(
      (totalRevenue - totalExpense - taxAmount).toFixed(2),
    );

    return {
      period,
      periodType,
      revenues: revenueItems,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      expensesByCategory,
      totalExpense,
      taxAmount,
      netProfit,
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
    restaurantId: string,
    periods: string[],
    type: 'monthly' | 'weekly' = 'monthly',
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

  async generateReport(
    dto: GenerateReportDto,
  ): Promise<{ content: Buffer | string; contentType: string }> {
    const categoryLabels: Record<string, string> = {
      SALARY: 'Maas',
      BILL: 'Fatura',
      TAX: 'Vergi',
      RENT: 'Kira',
      SUPPLIER: 'Tedarikci',
      OTHER: 'Diger',
    };

    const periodLabel =
      dto.periodType === 'monthly'
        ? `Aylik Rapor: ${dto.period}`
        : `Haftalik Rapor: ${dto.period}`;

    const templateData = {
      restaurantName: dto.restaurantName,
      periodLabel,
      period: dto.period,
      periodType: dto.periodType,
      revenues: dto.revenues,
      totalRevenue: dto.totalRevenue,
      totalRevenueEdited: dto.totalRevenueEdited,
      expenses: dto.expenses.map((e) => ({
        ...e,
        categoryLabel: categoryLabels[e.category] || e.category,
      })),
      totalExpense: dto.totalExpense,
      totalExpenseEdited: dto.totalExpenseEdited,
      taxAmount: dto.taxAmount,
      taxEdited: dto.taxEdited,
      netProfit: dto.netProfit,
      netProfitEdited: dto.netProfitEdited,
      isProfit: dto.netProfit >= 0,
      generatedAt: new Date().toLocaleString('tr-TR'),
    };

    const html = this.reportTemplate(templateData);

    if (dto.format === 'html') {
      return { content: html, contentType: 'text/html' };
    }

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });

      return {
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      };
    } finally {
      await browser.close();
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/report/report.service.ts
git commit -m "feat: add ReportService with monthly, weekly, comparison, and PDF generation"
```

---

### Task 4: Create Handlebars report template

**Files:**
- Create: `backend/src/report/templates/report.hbs`

- [ ] **Step 1: Write the Handlebars template**

```handlebars
{{!-- backend/src/report/templates/report.hbs --}}
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{restaurantName}} - {{periodLabel}}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a2e;
      background: #ffffff;
      padding: 40px;
      font-size: 14px;
    }

    .report-header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #16213e;
      padding-bottom: 20px;
    }

    .report-header h1 {
      font-size: 28px;
      color: #16213e;
      margin-bottom: 8px;
    }

    .report-header h2 {
      font-size: 18px;
      color: #0f3460;
      font-weight: 400;
    }

    .report-header .generated-at {
      font-size: 12px;
      color: #888;
      margin-top: 8px;
    }

    .report-body {
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    }

    .report-section {
      flex: 1;
    }

    .report-section h3 {
      font-size: 18px;
      color: #0f3460;
      border-bottom: 2px solid #e94560;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      background: #f5f5f5;
      font-weight: 600;
      color: #16213e;
      font-size: 13px;
    }

    td {
      font-size: 13px;
    }

    .amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .total-row {
      font-weight: 700;
      background: #f0f4ff;
      border-top: 2px solid #16213e;
    }

    .total-row td {
      padding: 12px;
      font-size: 15px;
    }

    .summary-section {
      background: #f8f9fa;
      border: 2px solid #16213e;
      border-radius: 8px;
      padding: 24px;
      margin-top: 20px;
    }

    .summary-section h3 {
      margin-bottom: 16px;
      border-bottom-color: #16213e;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
      font-size: 15px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-row.net-profit {
      font-size: 20px;
      font-weight: 700;
      border-top: 2px solid #16213e;
      padding-top: 16px;
      margin-top: 8px;
    }

    .profit-positive {
      color: #2e7d32;
    }

    .profit-negative {
      color: #c62828;
    }

    .edited-marker {
      color: #e94560;
      font-size: 11px;
      font-style: italic;
      margin-left: 8px;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 11px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>{{restaurantName}}</h1>
    <h2>{{periodLabel}}</h2>
    <div class="generated-at">Olusturulma: {{generatedAt}}</div>
  </div>

  <div class="report-body">
    {{!-- Left side: Revenues --}}
    <div class="report-section">
      <h3>Gelirler (Ciro)</h3>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th class="amount">Tutar</th>
            <th>Not</th>
          </tr>
        </thead>
        <tbody>
          {{#each revenues}}
          <tr>
            <td>{{this.date}}{{editedMarker this.isEdited}}</td>
            <td class="amount">{{formatCurrency this.amount}}</td>
            <td>{{this.notes}}</td>
          </tr>
          {{/each}}
          <tr class="total-row">
            <td>Toplam Gelir</td>
            <td class="amount">{{formatCurrency totalRevenue}}{{editedMarker totalRevenueEdited}}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    {{!-- Right side: Expenses by Category --}}
    <div class="report-section">
      <h3>Giderler</h3>
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th class="amount">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {{#each expenses}}
          <tr>
            <td>{{this.categoryLabel}}{{editedMarker this.isEdited}}</td>
            <td class="amount">{{formatCurrency this.amount}}</td>
          </tr>
          {{/each}}
          <tr class="total-row">
            <td>Toplam Gider</td>
            <td class="amount">{{formatCurrency totalExpense}}{{editedMarker totalExpenseEdited}}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  {{!-- Summary Section --}}
  <div class="summary-section">
    <h3>Ozet</h3>
    <div class="summary-row">
      <span>Toplam Gelir</span>
      <span>{{formatCurrency totalRevenue}}{{editedMarker totalRevenueEdited}}</span>
    </div>
    <div class="summary-row">
      <span>Toplam Gider</span>
      <span>{{formatCurrency totalExpense}}{{editedMarker totalExpenseEdited}}</span>
    </div>
    <div class="summary-row">
      <span>Vergi (KDV %20)</span>
      <span>{{formatCurrency taxAmount}}{{editedMarker taxEdited}}</span>
    </div>
    <div class="summary-row net-profit">
      <span>Net Kar/Zarar</span>
      <span class="{{#if isProfit}}profit-positive{{else}}profit-negative{{/if}}">
        {{formatCurrency netProfit}}{{editedMarker netProfitEdited}}
      </span>
    </div>
  </div>

  <div class="footer">
    <p>Bu rapor HepYonet sistemi tarafindan otomatik olusturulmustur.</p>
  </div>
</body>
</html>
```

- [ ] **Step 2: Ensure the template is copied to dist on build**

NestJS does not copy non-TS files to `dist/` by default. Update `nest-cli.json` to include assets:

```json
// backend/nest-cli.json — add/merge the compilerOptions.assets field
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "report/templates/**/*",
        "watchAssets": true
      }
    ]
  }
}
```

If `nest-cli.json` already exists, merge the `assets` array into the existing `compilerOptions`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/report/templates/report.hbs backend/nest-cli.json
git commit -m "feat: add Handlebars report template and configure asset copying"
```

---

### Task 5: Create Report Controller

**Files:**
- Create: `backend/src/report/report.controller.ts`

- [ ] **Step 1: Write ReportController**

```typescript
// backend/src/report/report.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ReportService } from './report.service';
import {
  MonthlyReportQueryDto,
  WeeklyReportQueryDto,
  CompareQueryDto,
} from './dto/report-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
@Roles(Role.ADMIN, Role.ACCOUNTANT)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('monthly')
  async getMonthlyReport(
    @Query() query: MonthlyReportQueryDto,
    @Req() req: any,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.reportService.getMonthlyReport(restaurantId, query.month);
  }

  @Get('weekly')
  async getWeeklyReport(
    @Query() query: WeeklyReportQueryDto,
    @Req() req: any,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.reportService.getWeeklyReport(restaurantId, query.week);
  }

  @Get('compare')
  async getComparison(@Query() query: CompareQueryDto, @Req() req: any) {
    const restaurantId = req.user.restaurantId;
    const periods = query.periods.split(',').map((p) => p.trim());
    if (periods.length < 2) {
      throw new BadRequestException(
        'At least 2 periods are required for comparison',
      );
    }
    const type = query.type || 'monthly';
    return this.reportService.getComparison(restaurantId, periods, type);
  }

  @Post('generate')
  async generateReport(
    @Body() dto: GenerateReportDto,
    @Res() res: Response,
  ) {
    const result = await this.reportService.generateReport(dto);

    if (dto.format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.content);
    } else {
      const filename = `rapor-${dto.period}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(result.content);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/report/report.controller.ts
git commit -m "feat: add ReportController with monthly, weekly, compare, and generate endpoints"
```

---

### Task 6: Create Report Module and register in AppModule

**Files:**
- Create: `backend/src/report/report.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write ReportModule**

```typescript
// backend/src/report/report.module.ts
import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
```

- [ ] **Step 2: Register ReportModule in AppModule**

Add the import to `backend/src/app.module.ts`:

```typescript
// backend/src/app.module.ts — add these lines
import { ReportModule } from './report/report.module';

// In the imports array, add:
ReportModule,
```

The full AppModule imports array should include `ReportModule` alongside the existing modules (PrismaModule, SupabaseModule, AuthModule, RestaurantModule, UserModule, AdminModule, and any other previously added modules).

- [ ] **Step 3: Verify build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds with no errors. The `dist/report/templates/report.hbs` file should exist.

- [ ] **Step 4: Commit**

```bash
git add backend/src/report/report.module.ts backend/src/app.module.ts
git commit -m "feat: add ReportModule and register in AppModule"
```

---

## Chunk 2: Frontend — Report Hooks and Components

### Task 7: Create report API hooks

**Files:**
- Create: `frontend/src/hooks/use-reports.ts`

- [ ] **Step 1: Write report hooks using TanStack Query**

```typescript
// frontend/src/hooks/use-reports.ts
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
  notes?: string;
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
    queryFn: async () => {
      const { data } = await api.get(`/reports/monthly?month=${month}`);
      return data;
    },
    enabled: !!month,
  });
}

export function useWeeklyReport(week: string | null) {
  return useQuery<ReportData>({
    queryKey: ['report', 'weekly', week],
    queryFn: async () => {
      const { data } = await api.get(`/reports/weekly?week=${week}`);
      return data;
    },
    enabled: !!week,
  });
}

export function useComparisonReport(
  periods: string[] | null,
  type: 'monthly' | 'weekly' = 'monthly',
) {
  const periodsParam = periods?.join(',');
  return useQuery<ReportData[]>({
    queryKey: ['report', 'compare', periodsParam, type],
    queryFn: async () => {
      const { data } = await api.get(
        `/reports/compare?periods=${periodsParam}&type=${type}`,
      );
      return data;
    },
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
        // Download PDF
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
        // Open HTML in new window
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/use-reports.ts
git commit -m "feat: add report API hooks with TanStack Query"
```

---

### Task 8: Create EditableCell component

**Files:**
- Create: `frontend/src/components/reports/editable-cell.tsx`

- [ ] **Step 1: Write EditableCell**

```typescript
// frontend/src/components/reports/editable-cell.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: number;
  originalValue: number;
  onChange: (value: number) => void;
  className?: string;
  formatFn?: (value: number) => string;
}

export function EditableCell({
  value,
  originalValue,
  onChange,
  className,
  formatFn,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdited = value !== originalValue;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      setInputValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setInputValue(String(value));
      setIsEditing(false);
    }
  };

  const defaultFormat = (v: number) =>
    v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  const format = formatFn || defaultFormat;

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        step="0.01"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn('w-32 h-8 text-right text-sm', className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        'flex items-center gap-1 text-right cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors',
        isEdited && 'text-orange-600 font-medium',
        className,
      )}
      title={
        isEdited
          ? `Orijinal: ${format(originalValue)} — Duzenlemek icin tiklayin`
          : 'Duzenlemek icin tiklayin'
      }
    >
      <span>{format(value)}</span>
      {isEdited && <Pencil className="h-3 w-3 text-orange-500 flex-shrink-0" />}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/editable-cell.tsx
git commit -m "feat: add EditableCell component with pencil icon for edited fields"
```

---

### Task 9: Create ReportTable component

**Files:**
- Create: `frontend/src/components/reports/report-table.tsx`

- [ ] **Step 1: Write ReportTable**

```typescript
// frontend/src/components/reports/report-table.tsx
'use client';

import { EditableCell } from './editable-cell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maas',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikci',
  OTHER: 'Diger',
};

interface RevenueEdit {
  index: number;
  amount: number;
  originalAmount: number;
}

interface ExpenseEdit {
  category: string;
  amount: number;
  originalAmount: number;
}

interface SummaryEdit {
  taxAmount: number;
  originalTaxAmount: number;
}

interface ReportTableProps {
  revenues: Array<{
    id: string;
    date: string | Date;
    amount: number;
    notes: string | null;
  }>;
  revenueEdits: Map<number, number>;
  onRevenueEdit: (index: number, value: number) => void;
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
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
  revenues,
  revenueEdits,
  onRevenueEdit,
  expensesByCategory,
  expenseEdits,
  onExpenseEdit,
  totalRevenue,
  totalExpense,
  taxAmount,
  originalTaxAmount,
  onTaxEdit,
  netProfit,
}: ReportTableProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side: Revenues */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-green-700 border-b pb-2">
            Gelirler (Ciro)
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.map((rev, index) => {
                const editedAmount = revenueEdits.get(index);
                const currentAmount =
                  editedAmount !== undefined ? editedAmount : rev.amount;
                return (
                  <TableRow key={rev.id || index}>
                    <TableCell>{formatDate(rev.date)}</TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={currentAmount}
                        originalValue={rev.amount}
                        onChange={(val) => onRevenueEdit(index, val)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rev.notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {revenues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Bu donem icin gelir kaydi bulunamadi
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-green-50 font-bold">
                <TableCell>Toplam Gelir</TableCell>
                <TableCell className="text-right text-green-700">
                  {totalRevenue.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                  })}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Right side: Expenses by Category */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b pb-2">
            Giderler
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesByCategory.map((exp) => {
                const editedAmount = expenseEdits.get(exp.category);
                const currentAmount =
                  editedAmount !== undefined ? editedAmount : exp.amount;
                return (
                  <TableRow key={exp.category}>
                    <TableCell>
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={currentAmount}
                        originalValue={exp.amount}
                        onChange={(val) => onExpenseEdit(exp.category, val)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-red-50 font-bold">
                <TableCell>Toplam Gider</TableCell>
                <TableCell className="text-right text-red-700">
                  {totalExpense.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                  })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-muted/30 border rounded-lg p-6 space-y-3">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Ozet</h3>
        <div className="flex justify-between items-center py-2">
          <span className="font-medium">Toplam Gelir</span>
          <span className="text-green-700 font-semibold">
            {totalRevenue.toLocaleString('tr-TR', {
              style: 'currency',
              currency: 'TRY',
            })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="font-medium">Toplam Gider</span>
          <span className="text-red-700 font-semibold">
            {totalExpense.toLocaleString('tr-TR', {
              style: 'currency',
              currency: 'TRY',
            })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="font-medium">Vergi (KDV %20)</span>
          <EditableCell
            value={taxAmount}
            originalValue={originalTaxAmount}
            onChange={onTaxEdit}
          />
        </div>
        <div className="flex justify-between items-center py-3 border-t-2 border-foreground mt-2">
          <span className="text-xl font-bold">Net Kar/Zarar</span>
          <span
            className={`text-xl font-bold ${
              netProfit >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {netProfit.toLocaleString('tr-TR', {
              style: 'currency',
              currency: 'TRY',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/report-table.tsx
git commit -m "feat: add ReportTable component with editable revenue and expense rows"
```

---

### Task 10: Create MonthlyReport component

**Files:**
- Create: `frontend/src/components/reports/monthly-report.tsx`

- [ ] **Step 1: Write MonthlyReport**

```typescript
// frontend/src/components/reports/monthly-report.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMonthlyReport, useGenerateReport } from '@/hooks/use-reports';
import { useAuthStore } from '@/stores/auth-store';
import { ReportTable } from './report-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, FileDown } from 'lucide-react';

export function MonthlyReport() {
  const currentDate = new Date();
  const defaultMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1,
  ).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [queryMonth, setQueryMonth] = useState<string | null>(null);
  const [format, setFormat] = useState<'pdf' | 'html'>('pdf');

  // Edit state
  const [revenueEdits, setRevenueEdits] = useState<Map<number, number>>(
    new Map(),
  );
  const [expenseEdits, setExpenseEdits] = useState<Map<string, number>>(
    new Map(),
  );
  const [taxEdit, setTaxEdit] = useState<number | null>(null);

  const { data: report, isLoading, error } = useMonthlyReport(queryMonth);
  const generateReport = useGenerateReport();
  const user = useAuthStore((s) => s.user);

  const resetEdits = useCallback(() => {
    setRevenueEdits(new Map());
    setExpenseEdits(new Map());
    setTaxEdit(null);
  }, []);

  const handleFetchReport = () => {
    resetEdits();
    setQueryMonth(selectedMonth);
  };

  const handleRevenueEdit = (index: number, value: number) => {
    setRevenueEdits((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
  };

  const handleExpenseEdit = (category: string, value: number) => {
    setExpenseEdits((prev) => {
      const next = new Map(prev);
      next.set(category, value);
      return next;
    });
  };

  const handleTaxEdit = (value: number) => {
    setTaxEdit(value);
  };

  // Computed values with edits applied
  const computedValues = useMemo(() => {
    if (!report) return null;

    let totalRevenue = 0;
    const revenues = report.revenues.map((rev, index) => {
      const editedAmount = revenueEdits.get(index);
      const amount = editedAmount !== undefined ? editedAmount : rev.amount;
      totalRevenue += amount;
      return {
        ...rev,
        date:
          typeof rev.date === 'string'
            ? rev.date
            : new Date(rev.date).toISOString().split('T')[0],
        originalAmount: rev.amount,
        amount,
        isEdited: editedAmount !== undefined && editedAmount !== rev.amount,
      };
    });

    const totalRevenueEdited = totalRevenue !== report.totalRevenue;

    let totalExpense = 0;
    const expenses = report.expensesByCategory.map((exp) => {
      const editedAmount = expenseEdits.get(exp.category);
      const amount = editedAmount !== undefined ? editedAmount : exp.amount;
      totalExpense += amount;
      return {
        category: exp.category,
        originalAmount: exp.amount,
        amount,
        isEdited: editedAmount !== undefined && editedAmount !== exp.amount,
      };
    });

    const totalExpenseEdited = totalExpense !== report.totalExpense;

    const currentTax = taxEdit !== null ? taxEdit : report.taxAmount;
    const taxEdited = currentTax !== report.taxAmount;

    const netProfit = parseFloat(
      (totalRevenue - totalExpense - currentTax).toFixed(2),
    );
    const netProfitEdited =
      totalRevenueEdited || totalExpenseEdited || taxEdited;

    return {
      revenues,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalRevenueEdited,
      expenses,
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      totalExpenseEdited,
      taxAmount: currentTax,
      taxEdited,
      netProfit,
      netProfitEdited,
    };
  }, [report, revenueEdits, expenseEdits, taxEdit]);

  const handleGenerate = () => {
    if (!report || !computedValues || !user?.restaurant) return;

    generateReport.mutate({
      period: report.period,
      periodType: 'monthly',
      restaurantName: user.restaurant.name,
      totalRevenue: computedValues.totalRevenue,
      totalRevenueEdited: computedValues.totalRevenueEdited,
      revenues: computedValues.revenues,
      expenses: computedValues.expenses,
      totalExpense: computedValues.totalExpense,
      totalExpenseEdited: computedValues.totalExpenseEdited,
      taxAmount: computedValues.taxAmount,
      taxEdited: computedValues.taxEdited,
      netProfit: computedValues.netProfit,
      netProfitEdited: computedValues.netProfitEdited,
      format,
    });
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="month-input">Ay</Label>
          <Input
            id="month-input"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          />
        </div>
        <Button onClick={handleFetchReport}>Raporu Getir</Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Rapor yukleniyor...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Rapor yuklenirken hata olustu. Lutfen tekrar deneyin.
        </div>
      )}

      {/* Report Content */}
      {report && computedValues && (
        <>
          <ReportTable
            revenues={report.revenues}
            revenueEdits={revenueEdits}
            onRevenueEdit={handleRevenueEdit}
            expensesByCategory={report.expensesByCategory}
            expenseEdits={expenseEdits}
            onExpenseEdit={handleExpenseEdit}
            totalRevenue={computedValues.totalRevenue}
            totalExpense={computedValues.totalExpense}
            taxAmount={computedValues.taxAmount}
            originalTaxAmount={report.taxAmount}
            onTaxEdit={handleTaxEdit}
            netProfit={computedValues.netProfit}
          />

          {/* Generate Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Cikti Formati</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as 'pdf' | 'html')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateReport.isPending}
              className="mt-auto"
              size="lg"
            >
              {generateReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : format === 'pdf' ? (
                <FileDown className="h-4 w-4 mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Raporla
            </Button>

            {(revenueEdits.size > 0 ||
              expenseEdits.size > 0 ||
              taxEdit !== null) && (
              <Button variant="outline" onClick={resetEdits} className="mt-auto">
                Duzeltmeleri Sifirla
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/monthly-report.tsx
git commit -m "feat: add MonthlyReport component with editable fields and generate action"
```

---

### Task 11: Create WeeklyReport component

**Files:**
- Create: `frontend/src/components/reports/weekly-report.tsx`

- [ ] **Step 1: Write WeeklyReport**

```typescript
// frontend/src/components/reports/weekly-report.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWeeklyReport, useGenerateReport } from '@/hooks/use-reports';
import { useAuthStore } from '@/stores/auth-store';
import { ReportTable } from './report-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, FileDown } from 'lucide-react';

function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function WeeklyReport() {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [queryWeek, setQueryWeek] = useState<string | null>(null);
  const [format, setFormat] = useState<'pdf' | 'html'>('pdf');

  // Edit state
  const [revenueEdits, setRevenueEdits] = useState<Map<number, number>>(
    new Map(),
  );
  const [expenseEdits, setExpenseEdits] = useState<Map<string, number>>(
    new Map(),
  );
  const [taxEdit, setTaxEdit] = useState<number | null>(null);

  const { data: report, isLoading, error } = useWeeklyReport(queryWeek);
  const generateReport = useGenerateReport();
  const user = useAuthStore((s) => s.user);

  const resetEdits = useCallback(() => {
    setRevenueEdits(new Map());
    setExpenseEdits(new Map());
    setTaxEdit(null);
  }, []);

  const handleFetchReport = () => {
    resetEdits();
    setQueryWeek(selectedWeek);
  };

  const handleRevenueEdit = (index: number, value: number) => {
    setRevenueEdits((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
  };

  const handleExpenseEdit = (category: string, value: number) => {
    setExpenseEdits((prev) => {
      const next = new Map(prev);
      next.set(category, value);
      return next;
    });
  };

  const handleTaxEdit = (value: number) => {
    setTaxEdit(value);
  };

  const computedValues = useMemo(() => {
    if (!report) return null;

    let totalRevenue = 0;
    const revenues = report.revenues.map((rev, index) => {
      const editedAmount = revenueEdits.get(index);
      const amount = editedAmount !== undefined ? editedAmount : rev.amount;
      totalRevenue += amount;
      return {
        ...rev,
        date:
          typeof rev.date === 'string'
            ? rev.date
            : new Date(rev.date).toISOString().split('T')[0],
        originalAmount: rev.amount,
        amount,
        isEdited: editedAmount !== undefined && editedAmount !== rev.amount,
      };
    });

    const totalRevenueEdited = totalRevenue !== report.totalRevenue;

    let totalExpense = 0;
    const expenses = report.expensesByCategory.map((exp) => {
      const editedAmount = expenseEdits.get(exp.category);
      const amount = editedAmount !== undefined ? editedAmount : exp.amount;
      totalExpense += amount;
      return {
        category: exp.category,
        originalAmount: exp.amount,
        amount,
        isEdited: editedAmount !== undefined && editedAmount !== exp.amount,
      };
    });

    const totalExpenseEdited = totalExpense !== report.totalExpense;

    const currentTax = taxEdit !== null ? taxEdit : report.taxAmount;
    const taxEdited = currentTax !== report.taxAmount;

    const netProfit = parseFloat(
      (totalRevenue - totalExpense - currentTax).toFixed(2),
    );
    const netProfitEdited =
      totalRevenueEdited || totalExpenseEdited || taxEdited;

    return {
      revenues,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalRevenueEdited,
      expenses,
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      totalExpenseEdited,
      taxAmount: currentTax,
      taxEdited,
      netProfit,
      netProfitEdited,
    };
  }, [report, revenueEdits, expenseEdits, taxEdit]);

  const handleGenerate = () => {
    if (!report || !computedValues || !user?.restaurant) return;

    generateReport.mutate({
      period: report.period,
      periodType: 'weekly',
      restaurantName: user.restaurant.name,
      totalRevenue: computedValues.totalRevenue,
      totalRevenueEdited: computedValues.totalRevenueEdited,
      revenues: computedValues.revenues,
      expenses: computedValues.expenses,
      totalExpense: computedValues.totalExpense,
      totalExpenseEdited: computedValues.totalExpenseEdited,
      taxAmount: computedValues.taxAmount,
      taxEdited: computedValues.taxEdited,
      netProfit: computedValues.netProfit,
      netProfitEdited: computedValues.netProfitEdited,
      format,
    });
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="week-input">Hafta</Label>
          <Input
            id="week-input"
            type="week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-48"
          />
        </div>
        <Button onClick={handleFetchReport}>Raporu Getir</Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Rapor yukleniyor...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Rapor yuklenirken hata olustu. Lutfen tekrar deneyin.
        </div>
      )}

      {/* Report Content */}
      {report && computedValues && (
        <>
          <ReportTable
            revenues={report.revenues}
            revenueEdits={revenueEdits}
            onRevenueEdit={handleRevenueEdit}
            expensesByCategory={report.expensesByCategory}
            expenseEdits={expenseEdits}
            onExpenseEdit={handleExpenseEdit}
            totalRevenue={computedValues.totalRevenue}
            totalExpense={computedValues.totalExpense}
            taxAmount={computedValues.taxAmount}
            originalTaxAmount={report.taxAmount}
            onTaxEdit={handleTaxEdit}
            netProfit={computedValues.netProfit}
          />

          {/* Generate Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Cikti Formati</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as 'pdf' | 'html')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateReport.isPending}
              className="mt-auto"
              size="lg"
            >
              {generateReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : format === 'pdf' ? (
                <FileDown className="h-4 w-4 mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Raporla
            </Button>

            {(revenueEdits.size > 0 ||
              expenseEdits.size > 0 ||
              taxEdit !== null) && (
              <Button variant="outline" onClick={resetEdits} className="mt-auto">
                Duzeltmeleri Sifirla
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/weekly-report.tsx
git commit -m "feat: add WeeklyReport component with editable fields and generate action"
```

---

### Task 12: Create ComparisonReport component

**Files:**
- Create: `frontend/src/components/reports/comparison-report.tsx`

- [ ] **Step 1: Write ComparisonReport with Recharts**

```typescript
// frontend/src/components/reports/comparison-report.tsx
'use client';

import { useState } from 'react';
import { useComparisonReport } from '@/hooks/use-reports';
import type { ReportData } from '@/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Maas',
  BILL: 'Fatura',
  TAX: 'Vergi',
  RENT: 'Kira',
  SUPPLIER: 'Tedarikci',
  OTHER: 'Diger',
};

export function ComparisonReport() {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1,
  ).padStart(2, '0')}`;

  const prevMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1,
  );
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(
    prevMonth.getMonth() + 1,
  ).padStart(2, '0')}`;

  const [periods, setPeriods] = useState<string[]>([prevMonthStr, currentMonth]);
  const [type, setType] = useState<'monthly' | 'weekly'>('monthly');
  const [queryPeriods, setQueryPeriods] = useState<string[] | null>(null);
  const [queryType, setQueryType] = useState<'monthly' | 'weekly'>('monthly');

  const { data: reports, isLoading, error } = useComparisonReport(
    queryPeriods,
    queryType,
  );

  const handleAddPeriod = () => {
    setPeriods((prev) => [...prev, '']);
  };

  const handleRemovePeriod = (index: number) => {
    if (periods.length <= 2) return;
    setPeriods((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePeriodChange = (index: number, value: string) => {
    setPeriods((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCompare = () => {
    const validPeriods = periods.filter((p) => p.trim() !== '');
    if (validPeriods.length >= 2) {
      setQueryPeriods(validPeriods);
      setQueryType(type);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  const formatMargin = (revenue: number, expense: number, tax: number) => {
    if (revenue === 0) return '0%';
    const net = revenue - expense - tax;
    return `${((net / revenue) * 100).toFixed(1)}%`;
  };

  // Chart data
  const overviewChartData = reports?.map((r) => ({
    period: r.period,
    Gelir: r.totalRevenue,
    Gider: r.totalExpense,
    Vergi: r.taxAmount,
    'Net Kar': r.netProfit,
  }));

  const marginChartData = reports?.map((r) => ({
    period: r.period,
    'Kar Marji (%)':
      r.totalRevenue > 0
        ? parseFloat(
            (
              ((r.totalRevenue - r.totalExpense - r.taxAmount) /
                r.totalRevenue) *
              100
            ).toFixed(1),
          )
        : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label>Karsilastirma Turu</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as 'monthly' | 'weekly')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Aylik</SelectItem>
                <SelectItem value="weekly">Haftalik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Donemler (en az 2)</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {periods.map((period, index) => (
              <div key={index} className="flex items-center gap-1">
                <Input
                  type={type === 'monthly' ? 'month' : 'week'}
                  value={period}
                  onChange={(e) => handlePeriodChange(index, e.target.value)}
                  className="w-48"
                />
                {periods.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePeriod(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="icon" onClick={handleAddPeriod}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button onClick={handleCompare}>Karsilastir</Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Karsilastirma yukleniyor...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Karsilastirma yuklenirken hata olustu. Lutfen tekrar deneyin.
        </div>
      )}

      {/* Comparison Results */}
      {reports && reports.length >= 2 && (
        <div className="space-y-8">
          {/* Overview Chart */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Gelir / Gider / Net Kar Karsilastirmasi
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={overviewChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="Gelir" fill="#22c55e" />
                <Bar dataKey="Gider" fill="#ef4444" />
                <Bar dataKey="Vergi" fill="#f59e0b" />
                <Bar dataKey="Net Kar" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin Trend Chart */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Kar Marji Trendi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={marginChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis unit="%" />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Kar Marji (%)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Detayli Karsilastirma
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">
                      Kalem
                    </TableHead>
                    {reports.map((r) => (
                      <TableHead key={r.period} className="text-right">
                        {r.period}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Revenue Row */}
                  <TableRow className="bg-green-50">
                    <TableCell className="sticky left-0 bg-green-50 font-medium">
                      Toplam Gelir
                    </TableCell>
                    {reports.map((r) => (
                      <TableCell
                        key={r.period}
                        className="text-right text-green-700 font-medium"
                      >
                        {formatCurrency(r.totalRevenue)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expense Category Rows */}
                  {[
                    'SALARY',
                    'BILL',
                    'TAX',
                    'RENT',
                    'SUPPLIER',
                    'OTHER',
                  ].map((cat) => (
                    <TableRow key={cat}>
                      <TableCell className="sticky left-0 bg-background">
                        {CATEGORY_LABELS[cat]}
                      </TableCell>
                      {reports.map((r) => {
                        const catData = r.expensesByCategory.find(
                          (e) => e.category === cat,
                        );
                        return (
                          <TableCell
                            key={r.period}
                            className="text-right"
                          >
                            {formatCurrency(catData?.amount || 0)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}

                  {/* Total Expense Row */}
                  <TableRow className="bg-red-50">
                    <TableCell className="sticky left-0 bg-red-50 font-medium">
                      Toplam Gider
                    </TableCell>
                    {reports.map((r) => (
                      <TableCell
                        key={r.period}
                        className="text-right text-red-700 font-medium"
                      >
                        {formatCurrency(r.totalExpense)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Tax Row */}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      Vergi
                    </TableCell>
                    {reports.map((r) => (
                      <TableCell
                        key={r.period}
                        className="text-right"
                      >
                        {formatCurrency(r.taxAmount)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Net Profit Row */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell className="sticky left-0 bg-background font-bold text-lg">
                      Net Kar/Zarar
                    </TableCell>
                    {reports.map((r) => (
                      <TableCell
                        key={r.period}
                        className={`text-right text-lg font-bold ${
                          r.netProfit >= 0
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {formatCurrency(r.netProfit)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Margin Row */}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      Kar Marji
                    </TableCell>
                    {reports.map((r) => (
                      <TableCell
                        key={r.period}
                        className="text-right font-medium"
                      >
                        {formatMargin(
                          r.totalRevenue,
                          r.totalExpense,
                          r.taxAmount,
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/comparison-report.tsx
git commit -m "feat: add ComparisonReport component with Recharts charts and detail table"
```

---

## Chunk 3: Frontend — Reports Page

### Task 13: Create the main Reports page with tabs

**Files:**
- Create: `frontend/src/app/dashboard/reports/page.tsx`

- [ ] **Step 1: Write the reports page**

```typescript
// frontend/src/app/dashboard/reports/page.tsx
'use client';

import { useState } from 'react';
import { MonthlyReport } from '@/components/reports/monthly-report';
import { WeeklyReport } from '@/components/reports/weekly-report';
import { ComparisonReport } from '@/components/reports/comparison-report';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { CalendarDays, CalendarRange, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('monthly');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Raporlar</h1>
        <p className="text-muted-foreground mt-1">
          Aylik ve haftalik finansal raporlarinizi goruntuleyin, duzenleyin ve
          cikti alin.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Aylik
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Haftalik
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Karsilastirma
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-6">
          <MonthlyReport />
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <WeeklyReport />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <ComparisonReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Add reports route to dashboard sidebar**

In `frontend/src/components/layout/sidebar.tsx`, add the reports link to the navigation items for ADMIN and ACCOUNTANT roles:

```typescript
// Add to the navigation items array in sidebar.tsx:
{
  title: 'Raporlar',
  href: '/dashboard/reports',
  icon: BarChart3, // import from lucide-react
  roles: ['ADMIN', 'ACCOUNTANT'],
},
```

- [ ] **Step 3: Add i18n strings**

In `frontend/messages/tr.json`, add (merge into existing structure):

```json
{
  "reports": {
    "title": "Raporlar",
    "monthly": "Aylik Rapor",
    "weekly": "Haftalik Rapor",
    "comparison": "Karsilastirma",
    "fetchReport": "Raporu Getir",
    "compare": "Karsilastir",
    "generate": "Raporla",
    "resetEdits": "Duzeltmeleri Sifirla",
    "revenue": "Gelir",
    "expense": "Gider",
    "tax": "Vergi",
    "netProfit": "Net Kar/Zarar",
    "margin": "Kar Marji",
    "totalRevenue": "Toplam Gelir",
    "totalExpense": "Toplam Gider",
    "format": "Cikti Formati",
    "pdf": "PDF",
    "html": "HTML",
    "loading": "Rapor yukleniyor...",
    "error": "Rapor yuklenirken hata olustu",
    "noData": "Bu donem icin veri bulunamadi",
    "editedMarker": "elle duzeltildi",
    "categories": {
      "SALARY": "Maas",
      "BILL": "Fatura",
      "TAX": "Vergi",
      "RENT": "Kira",
      "SUPPLIER": "Tedarikci",
      "OTHER": "Diger"
    }
  }
}
```

- [ ] **Step 4: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/reports/page.tsx frontend/src/components/layout/sidebar.tsx frontend/messages/tr.json
git commit -m "feat: add Reports page with monthly, weekly, comparison tabs and sidebar link"
```

---

## Chunk 4: Integration Verification

### Task 14: End-to-end verification

- [ ] **Step 1: Verify backend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run build
```
Expected: Build succeeds. Check that `dist/report/templates/report.hbs` exists.

- [ ] **Step 2: Verify template asset was copied**

```bash
ls /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend/dist/report/templates/report.hbs
```
Expected: File exists.

- [ ] **Step 3: Verify frontend build**

```bash
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual smoke test checklist**

Run both backend and frontend:

```bash
# Terminal 1
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/backend
npm run start:dev

# Terminal 2
cd /Users/kadirdogrubakar/Desktop/claude/hepyonet/frontend
npm run dev
```

Test the following (as ADMIN or ACCOUNTANT user):

1. Navigate to `/dashboard/reports`
2. Verify 3 tabs are visible: Aylik, Haftalik, Karsilastirma
3. On Aylik tab: select a month, click "Raporu Getir", see revenue/expense table
4. Click on a revenue amount cell — it should become editable
5. Change the value — pencil icon should appear
6. Click "Raporla" with PDF format — PDF should download
7. Click "Raporla" with HTML format — HTML should open in new tab
8. Check that edited fields show "elle duzeltildi" in generated output
9. On Haftalik tab: repeat steps 3-8 with a week
10. On Karsilastirma tab: select 2+ months, click "Karsilastir"
11. Verify bar chart and line chart render correctly
12. Verify comparison table shows all periods side by side

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete reporting module — Plan 6"
```

---

## Summary

### API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/reports/monthly?month=YYYY-MM` | Get monthly report data | ADMIN, ACCOUNTANT |
| GET | `/api/reports/weekly?week=YYYY-WXX` | Get weekly report data | ADMIN, ACCOUNTANT |
| GET | `/api/reports/compare?periods=P1,P2&type=monthly` | Compare 2+ periods | ADMIN, ACCOUNTANT |
| POST | `/api/reports/generate` | Generate PDF/HTML with (possibly edited) data | ADMIN, ACCOUNTANT |

### Report Generation Flow

1. Frontend fetches report data from GET `/api/reports/monthly` (or weekly)
2. User sees report with all values displayed as editable cells
3. User optionally clicks on values to edit them (tracked in frontend state only, NOT saved to DB)
4. Edited fields show a pencil icon and orange text
5. User selects output format (PDF or HTML) and clicks "Raporla"
6. Frontend sends current values (including edits) to POST `/api/reports/generate`
7. Backend renders Handlebars HTML template with the provided values, marking edited fields with "elle duzeltildi"
8. For PDF: Puppeteer converts HTML to PDF, backend returns the PDF buffer
9. For HTML: Backend returns the rendered HTML string
10. Frontend downloads the PDF or opens HTML in a new browser tab

### Key Design Decisions

- **Puppeteer over @react-pdf/renderer:** We use Puppeteer for HTML-to-PDF conversion. This allows us to reuse a single Handlebars HTML template for both HTML and PDF output, avoiding duplication. Puppeteer produces high-fidelity PDFs that match the HTML preview exactly.
- **Handlebars for templates:** Simple, logic-light templating that keeps the report layout maintainable and separate from business logic.
- **Frontend-only edits:** Edits are tracked in React state (Maps) and never persisted to the database. This matches the spec requirement that edits are purely for report output purposes.
- **Tax auto-calculation:** A simplified 20% KDV rate is applied to total revenue. The tax value is editable on the report screen like any other field.
- **Distributed expenses:** For monthly reports, distributed amounts are fetched directly by month string from `ExpenseDistribution`. For weekly reports, distributed amounts are prorated based on the overlap between the week and the distribution month.
