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
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, email: true, name: true },
          take: 1,
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
