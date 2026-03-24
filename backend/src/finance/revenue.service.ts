import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateRevenueDto) {
    const date = new Date(dto.date);

    const existing = await this.prisma.revenue.findFirst({
      where: {
        restaurantId,
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Bu tarih icin zaten bir ciro kaydi var. Guncellemek icin mevcut kaydi duzenleyin.',
      );
    }

    return this.prisma.revenue.create({
      data: {
        restaurantId,
        date,
        amount: dto.amount,
        source: 'MANUAL',
        notes: dto.notes || null,
      },
    });
  }

  async findAll(restaurantId: string, params?: { startDate?: string; endDate?: string; month?: string }) {
    const where: any = { restaurantId };

    if (params?.month) {
      const [yearStr, monthStr] = params.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else {
      if (params?.startDate || params?.endDate) {
        where.date = {};
        if (params.startDate) {
          where.date.gte = new Date(params.startDate);
        }
        if (params.endDate) {
          where.date.lte = new Date(params.endDate);
        }
      }
    }

    return this.prisma.revenue.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, restaurantId },
    });

    if (!revenue) {
      throw new NotFoundException('Ciro kaydi bulunamadi');
    }

    return revenue;
  }

  async update(restaurantId: string, id: string, dto: UpdateRevenueDto) {
    await this.findOne(restaurantId, id);

    return this.prisma.revenue.update({
      where: { id },
      data: {
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    await this.prisma.revenue.delete({ where: { id } });
    return { message: 'Ciro kaydi silindi' };
  }

  async getMonthlySummary(restaurantId: string, month: string) {
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const from = new Date(`${year}-${String(m).padStart(2, '0')}-01T00:00:00`);
    const lastDay = new Date(year, m, 0).getDate();
    const to = new Date(`${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999`);

    const revenues = await this.prisma.revenue.findMany({
      where: {
        restaurantId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });

    const totalRevenue = revenues.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );

    const directExpenses = await this.prisma.expense.findMany({
      where: {
        restaurantId,
        isDistributed: false,
        paymentDate: { gte: from, lte: to },
      },
      include: { category: true },
    });

    const distributedExpenses = await this.prisma.expenseDistribution.findMany({
      where: {
        month,
        expense: { restaurantId },
      },
      include: {
        expense: {
          select: { id: true, title: true, categoryId: true, category: { select: { name: true } }, amount: true },
        },
      },
    });

    const totalDirectExpenses = directExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const totalDistributedExpenses = distributedExpenses.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );

    const totalExpenses = totalDirectExpenses + totalDistributedExpenses;
    const netIncome = totalRevenue - totalExpenses;

    const categoryBreakdown: Record<string, number> = {};

    for (const expense of directExpenses) {
      const cat = (expense as any).category?.name || 'Diğer';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(expense.amount);
    }

    for (const dist of distributedExpenses) {
      const cat = dist.expense.category?.name || 'Diğer';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(dist.amount);
    }

    return {
      month,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalDirectExpenses: Math.round(totalDirectExpenses * 100) / 100,
      totalDistributedExpenses: Math.round(totalDistributedExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      revenueCount: revenues.length,
      dailyRevenues: revenues.map((r) => ({
        id: r.id,
        date: r.date,
        amount: Number(r.amount),
        notes: r.notes,
      })),
      directExpenses: directExpenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        category: (e as any).category?.name || 'Diğer',
        paymentDate: e.paymentDate,
      })),
      distributedExpenses: distributedExpenses.map((d) => ({
        id: d.id,
        expenseId: d.expense.id,
        title: d.expense.title,
        category: d.expense.category?.name || 'Diğer',
        originalAmount: Number(d.expense.amount),
        distributedAmount: Number(d.amount),
        month: d.month,
      })),
      categoryBreakdown,
      dailyBreakdown: this.buildDailyBreakdown(year, m, revenues, directExpenses),
    };
  }

  private buildDailyBreakdown(
    year: number,
    month: number,
    revenues: any[],
    expenses: any[],
  ) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: { day: number; date: string; revenue: number; expense: number; net: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayRevenues = revenues.filter((r) => new Date(r.date).getDate() === day);
      const dayExpenses = expenses.filter((e) => new Date(e.paymentDate).getDate() === day);

      const revenue = dayRevenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
      const expense = dayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      days.push({
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        revenue: Math.round(revenue),
        expense: Math.round(expense),
        net: Math.round(revenue - expense),
      });
    }

    return days;
  }
}
