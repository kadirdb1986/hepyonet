import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialTypeService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.materialTypeConfig.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(restaurantId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Stok tipi adi bos olamaz');
    }

    const existing = await this.prisma.materialTypeConfig.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (existing) {
      throw new BadRequestException('Bu isimde bir stok tipi zaten var');
    }

    return this.prisma.materialTypeConfig.create({
      data: { restaurantId, name: trimmed },
    });
  }

  async update(restaurantId: string, id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Stok tipi adi bos olamaz');
    }

    const typeConfig = await this.prisma.materialTypeConfig.findFirst({
      where: { id, restaurantId },
    });

    if (!typeConfig) {
      throw new NotFoundException('Stok tipi bulunamadi');
    }

    const duplicate = await this.prisma.materialTypeConfig.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException('Bu isimde bir stok tipi zaten var');
    }

    // Eski adla kayıtlı stok kalemlerinin tipini de güncelle
    if (typeConfig.name !== trimmed) {
      await this.prisma.rawMaterial.updateMany({
        where: { restaurantId, type: typeConfig.name },
        data: { type: trimmed },
      });
    }

    return this.prisma.materialTypeConfig.update({
      where: { id },
      data: { name: trimmed },
    });
  }

  async remove(restaurantId: string, id: string) {
    const typeConfig = await this.prisma.materialTypeConfig.findFirst({
      where: { id, restaurantId },
    });

    if (!typeConfig) {
      throw new NotFoundException('Stok tipi bulunamadi');
    }

    // Kullanımda olan tipi silmeye izin verme
    const usageCount = await this.prisma.rawMaterial.count({
      where: { restaurantId, type: typeConfig.name },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Bu stok tipi ${usageCount} kalemde kullaniliyor. Silmek icin once bu kalemlerin tipini degistirin.`,
      );
    }

    await this.prisma.materialTypeConfig.delete({ where: { id } });
    return { message: 'Stok tipi silindi' };
  }
}
