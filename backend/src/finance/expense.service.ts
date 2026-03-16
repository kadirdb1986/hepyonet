import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { DistributeExpenseDto, DistributionType } from './dto/distribute-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        restaurantId,
        title: dto.title,
        amount: dto.amount,
        category: dto.category,
        paymentDate: new Date(dto.paymentDate),
        effectiveMonth: dto.effectiveMonth || null,
        effectiveEndMonth: dto.effectiveEndMonth || null,
      },
    });

    // Farklı ay: tek ay dağıtımı oluştur
    if (dto.effectiveMonth && !dto.effectiveEndMonth) {
      await this.prisma.$transaction([
        this.prisma.expenseDistribution.create({
          data: {
            expenseId: expense.id,
            month: dto.effectiveMonth,
            amount: dto.amount,
          },
        }),
        this.prisma.expense.update({
          where: { id: expense.id },
          data: {
            isDistributed: true,
            distributionType: 'NONE',
            distributionMonths: 1,
          },
        }),
      ]);
    }

    // Birden fazla ay: eşit dağıtım oluştur
    if (dto.effectiveMonth && dto.effectiveEndMonth) {
      const months = this.getMonthRange(dto.effectiveMonth, dto.effectiveEndMonth);
      const totalAmount = Number(dto.amount);
      const perMonth = Math.floor((totalAmount * 100) / months.length) / 100;
      const remainder = Math.round((totalAmount - perMonth * months.length) * 100) / 100;

      const distributions = months.map((month, i) => ({
        expenseId: expense.id,
        month,
        amount: i === 0 ? perMonth + remainder : perMonth,
      }));

      await this.prisma.$transaction([
        ...distributions.map((d) =>
          this.prisma.expenseDistribution.create({ data: d }),
        ),
        this.prisma.expense.update({
          where: { id: expense.id },
          data: {
            isDistributed: true,
            distributionType: 'EQUAL',
            distributionMonths: months.length,
          },
        }),
      ]);
    }

    return this.findOne(restaurantId, expense.id);
  }

  async findAll(restaurantId: string, params?: { category?: string; startDate?: string; endDate?: string }) {
    const where: any = { restaurantId };

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.startDate || params?.endDate) {
      where.paymentDate = {};
      if (params.startDate) {
        where.paymentDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    return this.prisma.expense.findMany({
      where,
      include: { distributions: true },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, restaurantId },
      include: { distributions: true },
    });

    if (!expense) {
      throw new NotFoundException('Gider bulunamadi');
    }

    return expense;
  }

  async update(restaurantId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(restaurantId, id);

    if (expense.isDistributed) {
      throw new BadRequestException(
        'Dagitimi yapilmis bir gider guncellenemez. Once dagitimi iptal edin.',
      );
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.paymentDate !== undefined && { paymentDate: new Date(dto.paymentDate) }),
      },
      include: { distributions: true },
    });
  }

  async remove(restaurantId: string, id: string) {
    const expense = await this.findOne(restaurantId, id);

    if (expense.isDistributed) {
      await this.prisma.expenseDistribution.deleteMany({
        where: { expenseId: id },
      });
    }

    await this.prisma.expense.delete({ where: { id } });

    return { message: 'Gider silindi' };
  }

  async distribute(restaurantId: string, id: string, dto: DistributeExpenseDto) {
    const expense = await this.findOne(restaurantId, id);

    if (expense.isDistributed) {
      throw new BadRequestException('Bu gider zaten dagitilmis');
    }

    if (dto.distributionType === DistributionType.NONE) {
      return this.distributeNone(expense);
    }

    if (!dto.distributionMonths || dto.distributionMonths < 2) {
      throw new BadRequestException('Dagitim ay sayisi en az 2 olmalidir');
    }

    if (dto.distributionType === DistributionType.EQUAL) {
      return this.distributeEqual(expense, dto.distributionMonths);
    }

    if (dto.distributionType === DistributionType.REVENUE_BASED) {
      return this.distributeRevenueBased(restaurantId, expense, dto.distributionMonths);
    }

    throw new BadRequestException('Gecersiz dagitim tipi');
  }

  async undistribute(restaurantId: string, id: string) {
    const expense = await this.findOne(restaurantId, id);

    if (!expense.isDistributed) {
      throw new BadRequestException('Bu gider dagitilmamis');
    }

    await this.prisma.expenseDistribution.deleteMany({
      where: { expenseId: id },
    });

    return this.prisma.expense.update({
      where: { id },
      data: {
        isDistributed: false,
        distributionType: 'NONE',
        distributionMonths: null,
      },
      include: { distributions: true },
    });
  }

  private async distributeNone(expense: any) {
    const month = this.getMonthString(expense.paymentDate);

    await this.prisma.$transaction([
      this.prisma.expenseDistribution.create({
        data: {
          expenseId: expense.id,
          month,
          amount: expense.amount,
        },
      }),
      this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          isDistributed: true,
          distributionType: 'NONE',
          distributionMonths: 1,
        },
      }),
    ]);

    return this.findOne(expense.restaurantId, expense.id);
  }

  private async distributeEqual(expense: any, months: number) {
    const totalAmount = Number(expense.amount);
    const perMonth = Math.floor((totalAmount * 100) / months) / 100;
    const remainder = Math.round((totalAmount - perMonth * months) * 100) / 100;

    const startDate = new Date(expense.paymentDate);
    const distributions: { expenseId: string; month: string; amount: number }[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const month = this.getMonthString(date);
      const amount = i === 0 ? perMonth + remainder : perMonth;

      distributions.push({
        expenseId: expense.id,
        month,
        amount,
      });
    }

    await this.prisma.$transaction([
      ...distributions.map((d) =>
        this.prisma.expenseDistribution.create({ data: d }),
      ),
      this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          isDistributed: true,
          distributionType: 'EQUAL',
          distributionMonths: months,
        },
      }),
    ]);

    return this.findOne(expense.restaurantId, expense.id);
  }

  private async distributeRevenueBased(
    restaurantId: string,
    expense: any,
    months: number,
  ) {
    const startDate = new Date(expense.paymentDate);
    const monthKeys: string[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      monthKeys.push(this.getMonthString(date));
    }

    const revenues = await Promise.all(
      monthKeys.map(async (monthKey) => {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const from = new Date(year, month - 1, 1);
        const to = new Date(year, month, 1);

        const result = await this.prisma.revenue.aggregate({
          where: {
            restaurantId,
            date: { gte: from, lt: to },
          },
          _sum: { amount: true },
        });

        return {
          month: monthKey,
          total: Number(result._sum.amount || 0),
        };
      }),
    );

    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0);

    if (totalRevenue === 0) {
      throw new BadRequestException(
        'Secilen aylarda ciro verisi bulunamadi. Ciro girilmeden gelir bazli dagitim yapilamaz.',
      );
    }

    const totalAmount = Number(expense.amount);
    let distributedSoFar = 0;

    const distributions: { expenseId: string; month: string; amount: number }[] = [];

    for (let i = 0; i < revenues.length; i++) {
      const ratio = revenues[i].total / totalRevenue;
      let amount: number;

      if (i === revenues.length - 1) {
        amount = Math.round((totalAmount - distributedSoFar) * 100) / 100;
      } else {
        amount = Math.round(totalAmount * ratio * 100) / 100;
        distributedSoFar += amount;
      }

      distributions.push({
        expenseId: expense.id,
        month: revenues[i].month,
        amount,
      });
    }

    await this.prisma.$transaction([
      ...distributions.map((d) =>
        this.prisma.expenseDistribution.create({ data: d }),
      ),
      this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          isDistributed: true,
          distributionType: 'REVENUE_BASED',
          distributionMonths: months,
        },
      }),
    ]);

    return this.findOne(expense.restaurantId, expense.id);
  }

  private getMonthString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private getMonthRange(start: string, end: string): string[] {
    const [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    const months: string[] = [];
    let y = sy;
    let m = sm;
    while (y < ey || (y === ey && m <= em)) {
      months.push(`${y}-${m.toString().padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return months;
  }
}
