import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PositionService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.positionConfig.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(restaurantId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Pozisyon adi bos olamaz');
    }

    const existing = await this.prisma.positionConfig.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (existing) {
      throw new BadRequestException('Bu isimde bir pozisyon zaten var');
    }

    return this.prisma.positionConfig.create({
      data: { restaurantId, name: trimmed },
    });
  }

  async update(id: string, restaurantId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Pozisyon adi bos olamaz');
    }

    const positionConfig = await this.prisma.positionConfig.findFirst({
      where: { id, restaurantId },
    });

    if (!positionConfig) {
      throw new NotFoundException('Pozisyon bulunamadi');
    }

    const duplicate = await this.prisma.positionConfig.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException('Bu isimde bir pozisyon zaten var');
    }

    // Eski adla kayitli personelin pozisyonunu da guncelle
    if (positionConfig.name !== trimmed) {
      await this.prisma.personnel.updateMany({
        where: { restaurantId, positionId: id },
        data: { position: trimmed },
      });
    }

    return this.prisma.positionConfig.update({
      where: { id },
      data: { name: trimmed },
    });
  }

  async remove(id: string, restaurantId: string) {
    const positionConfig = await this.prisma.positionConfig.findFirst({
      where: { id, restaurantId },
    });

    if (!positionConfig) {
      throw new NotFoundException('Pozisyon bulunamadi');
    }

    const usageCount = await this.prisma.personnel.count({
      where: { restaurantId, positionId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Bu pozisyon ${usageCount} personelde kullaniliyor. Silmek icin once bu personelin pozisyonunu degistirin.`,
      );
    }

    await this.prisma.positionConfig.delete({ where: { id } });
    return { message: 'Pozisyon silindi' };
  }
}
