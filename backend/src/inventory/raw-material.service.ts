import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';

@Injectable()
export class RawMaterialService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.rawMaterial.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id, restaurantId },
      include: {
        stockMovements: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }
    return material;
  }

  async create(restaurantId: string, dto: CreateRawMaterialDto) {
    return this.prisma.rawMaterial.create({
      data: {
        restaurantId,
        name: dto.name,
        unit: dto.unit,
        currentStock: dto.currentStock ?? 0,
        lastPurchasePrice: dto.lastPurchasePrice ?? 0,
        minStockLevel: dto.minStockLevel ?? 0,
      },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateRawMaterialDto) {
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }
    return this.prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
        ...(dto.lastPurchasePrice !== undefined && { lastPurchasePrice: dto.lastPurchasePrice }),
        ...(dto.minStockLevel !== undefined && { minStockLevel: dto.minStockLevel }),
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }
    return this.prisma.rawMaterial.delete({ where: { id } });
  }

  async findLowStock(restaurantId: string) {
    return this.prisma.rawMaterial.findMany({
      where: {
        restaurantId,
        currentStock: {
          lte: this.prisma.rawMaterial.fields.minStockLevel,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findLowStockRaw(restaurantId: string) {
    // Use raw query because Prisma does not support comparing two columns directly
    return this.prisma.$queryRaw`
      SELECT * FROM raw_materials
      WHERE "restaurantId" = ${restaurantId}
        AND "currentStock" <= "minStockLevel"
        AND "minStockLevel" > 0
      ORDER BY name ASC
    `;
  }
}
