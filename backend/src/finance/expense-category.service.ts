import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpenseCategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.expenseCategoryConfig.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(restaurantId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Kategori adi bos olamaz');
    }

    const existing = await this.prisma.expenseCategoryConfig.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (existing) {
      throw new BadRequestException('Bu isimde bir kategori zaten var');
    }

    return this.prisma.expenseCategoryConfig.create({
      data: { restaurantId, name: trimmed },
    });
  }

  async update(restaurantId: string, id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Kategori adi bos olamaz');
    }

    const cat = await this.prisma.expenseCategoryConfig.findFirst({
      where: { id, restaurantId },
    });

    if (!cat) {
      throw new NotFoundException('Kategori bulunamadi');
    }

    const duplicate = await this.prisma.expenseCategoryConfig.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException('Bu isimde bir kategori zaten var');
    }

    return this.prisma.expenseCategoryConfig.update({
      where: { id },
      data: { name: trimmed },
    });
  }

  async remove(restaurantId: string, id: string) {
    const cat = await this.prisma.expenseCategoryConfig.findFirst({
      where: { id, restaurantId },
    });

    if (!cat) {
      throw new NotFoundException('Kategori bulunamadi');
    }

    await this.prisma.expenseCategoryConfig.delete({ where: { id } });
    return { message: 'Kategori silindi' };
  }
}
