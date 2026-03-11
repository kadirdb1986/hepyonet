import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async create(restaurantId: string, name: string) {
    const existing = await this.prisma.category.findFirst({
      where: { restaurantId, name },
    });
    if (existing) {
      throw new ConflictException('Bu isimde bir kategori zaten mevcut');
    }

    return this.prisma.category.create({
      data: { restaurantId, name },
    });
  }

  async update(id: string, restaurantId: string, name: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId },
    });
    if (!category) {
      throw new NotFoundException('Kategori bulunamadi');
    }

    const duplicate = await this.prisma.category.findFirst({
      where: { restaurantId, name, id: { not: id } },
    });
    if (duplicate) {
      throw new ConflictException('Bu isimde bir kategori zaten mevcut');
    }

    return this.prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  async remove(id: string, restaurantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      throw new NotFoundException('Kategori bulunamadi');
    }

    // Unlink products from this category before deleting
    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    return this.prisma.category.delete({ where: { id } });
  }
}
