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

    // Fetch categories ordered by displayOrder
    const orderedCategories = await this.prisma.category.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true },
    });

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
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Group items by category in category displayOrder
    const categoryMap = new Map<string, { name: string; items: typeof menuItems }>();
    for (const cat of orderedCategories) {
      categoryMap.set(cat.id, { name: cat.name, items: [] });
    }
    categoryMap.set('__other__', { name: 'Diger', items: [] });

    for (const item of menuItems) {
      const catId = item.product.categoryId || '__other__';
      const entry = categoryMap.get(catId) || categoryMap.get('__other__')!;
      entry.items.push(item);
    }

    return {
      restaurant,
      categories: Array.from(categoryMap.values())
        .filter((c) => c.items.length > 0)
        .map((c) => ({
          name: c.name,
          items: c.items.map((item) => ({
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
