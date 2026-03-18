import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getRestaurants(status?: RestaurantStatus) {
    const where = status ? { status } : {};
    return this.prisma.restaurant.findMany({
      where,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRestaurant(id: string, status: RestaurantStatus) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: { status },
    });
  }

  async deleteRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    // Delete all related data in order
    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantMember.deleteMany({ where: { restaurantId: id } });
      await tx.simulationDayWeight.deleteMany({ where: { simulation: { restaurantId: id } } });
      await tx.simulationProduct.deleteMany({ where: { simulation: { restaurantId: id } } });
      await tx.simulationExpense.deleteMany({ where: { simulation: { restaurantId: id } } });
      await tx.simulation.deleteMany({ where: { restaurantId: id } });
      await tx.simFixedExpense.deleteMany({ where: { restaurantId: id } });
      await tx.simFixedRevenue.deleteMany({ where: { restaurantId: id } });
      await tx.leaveRecord.deleteMany({ where: { restaurantId: id } });
      await tx.personnel.deleteMany({ where: { restaurantId: id } });
      await tx.expenseDistribution.deleteMany({ where: { expense: { restaurantId: id } } });
      await tx.expense.deleteMany({ where: { restaurantId: id } });
      await tx.expenseCategoryConfig.deleteMany({ where: { restaurantId: id } });
      await tx.revenue.deleteMany({ where: { restaurantId: id } });
      await tx.productIngredient.deleteMany({ where: { product: { restaurantId: id } } });
      await tx.menuItem.deleteMany({ where: { restaurantId: id } });
      await tx.product.deleteMany({ where: { restaurantId: id } });
      await tx.category.deleteMany({ where: { restaurantId: id } });
      await tx.stockMovement.deleteMany({ where: { restaurantId: id } });
      await tx.rawMaterial.deleteMany({ where: { restaurantId: id } });
      await tx.supplier.deleteMany({ where: { restaurantId: id } });
      await tx.materialTypeConfig.deleteMany({ where: { restaurantId: id } });
      await tx.positionConfig.deleteMany({ where: { restaurantId: id } });
      await tx.restaurant.delete({ where: { id } });
    });

    return { message: 'Restoran ve tüm verileri silindi' };
  }

  async getStats() {
    const [totalRestaurants, pendingRestaurants, approvedRestaurants, totalUsers] =
      await Promise.all([
        this.prisma.restaurant.count(),
        this.prisma.restaurant.count({ where: { status: 'PENDING' } }),
        this.prisma.restaurant.count({ where: { status: 'APPROVED' } }),
        this.prisma.user.count(),
      ]);

    return {
      totalRestaurants,
      pendingRestaurants,
      approvedRestaurants,
      totalUsers,
    };
  }
}
