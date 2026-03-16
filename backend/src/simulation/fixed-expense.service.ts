import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FixedExpenseService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.simFixedExpense.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(restaurantId: string, data: { name: string; amount?: number }) {
    return this.prisma.simFixedExpense.create({
      data: {
        restaurantId,
        name: data.name,
        ...(data.amount !== undefined && { amount: data.amount }),
      },
    });
  }

  async update(
    id: string,
    restaurantId: string,
    data: { name?: string; amount?: number },
  ) {
    const record = await this.prisma.simFixedExpense.findFirst({
      where: { id, restaurantId },
    });

    if (!record) {
      throw new NotFoundException('Sabit gider bulunamadi');
    }

    return this.prisma.simFixedExpense.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amount !== undefined && { amount: data.amount }),
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    const record = await this.prisma.simFixedExpense.findFirst({
      where: { id, restaurantId },
    });

    if (!record) {
      throw new NotFoundException('Sabit gider bulunamadi');
    }

    await this.prisma.simFixedExpense.delete({ where: { id } });
    return { message: 'Sabit gider silindi' };
  }
}
