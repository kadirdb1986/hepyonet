import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuItems(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            image: true,
            price: true,
            category: true,
            isMenuItem: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async updateOrder(restaurantId: string, dto: UpdateMenuOrderDto) {
    const updates = dto.items.map((item) =>
      this.prisma.menuItem.updateMany({
        where: {
          id: item.menuItemId,
          restaurantId,
        },
        data: {
          displayOrder: item.displayOrder,
        },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.getMenuItems(restaurantId);
  }

  async toggleAvailability(
    restaurantId: string,
    productId: string,
    dto: ToggleAvailabilityDto,
  ) {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: {
        productId,
        restaurantId,
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return this.prisma.menuItem.update({
      where: { id: menuItem.id },
      data: { isAvailable: dto.isAvailable },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            image: true,
            price: true,
            category: true,
            isMenuItem: true,
          },
        },
      },
    });
  }

  async getPublicMenu(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        address: true,
        phone: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        isAvailable: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            image: true,
            price: true,
            category: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const categories: Record<string, typeof menuItems> = {};
    for (const item of menuItems) {
      const category = item.product.category || 'Diger';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    }

    return {
      restaurant,
      categories: Object.entries(categories).map(([name, items]) => ({
        name,
        items: items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          code: item.product.code,
          description: item.product.description,
          image: item.product.image,
          price: item.product.price,
        })),
      })),
    };
  }
}
