import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FixedRevenueService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.simFixedRevenue.findMany({
      where: { restaurantId },
      include: {
        product: {
          select: { id: true, name: true, price: true },
        },
      },
    });
  }

  async upsert(
    restaurantId: string,
    data: { productId: string; quantity: number },
  ) {
    return this.prisma.simFixedRevenue.upsert({
      where: {
        restaurantId_productId: {
          restaurantId,
          productId: data.productId,
        },
      },
      update: {
        quantity: data.quantity,
      },
      create: {
        restaurantId,
        productId: data.productId,
        quantity: data.quantity,
      },
      include: {
        product: {
          select: { id: true, name: true, price: true },
        },
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    const record = await this.prisma.simFixedRevenue.findFirst({
      where: { id, restaurantId },
    });

    if (!record) {
      throw new NotFoundException('Sabit gelir bulunamadi');
    }

    await this.prisma.simFixedRevenue.delete({ where: { id } });
    return { message: 'Sabit gelir silindi' };
  }
}
