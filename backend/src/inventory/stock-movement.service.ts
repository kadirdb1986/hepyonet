import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class StockMovementService {
  constructor(private prisma: PrismaService) {}

  async findByRawMaterial(rawMaterialId: string, restaurantId: string) {
    // Verify the raw material belongs to the restaurant
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id: rawMaterialId, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }

    return this.prisma.stockMovement.findMany({
      where: { rawMaterialId, restaurantId },
      orderBy: { date: 'desc' },
      include: {
        rawMaterial: {
          select: { name: true, unit: true },
        },
      },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.stockMovement.findMany({
      where: { restaurantId },
      orderBy: { date: 'desc' },
      include: {
        rawMaterial: {
          select: { id: true, name: true, unit: true },
        },
      },
    });
  }

  async create(restaurantId: string, dto: CreateStockMovementDto) {
    // Verify raw material exists and belongs to the restaurant
    const material = await this.prisma.rawMaterial.findFirst({
      where: { id: dto.rawMaterialId, restaurantId },
    });
    if (!material) {
      throw new NotFoundException('Ham madde bulunamadi');
    }

    // For OUT movements, check sufficient stock
    if (dto.type === StockMovementType.OUT) {
      const currentStock = Number(material.currentStock);
      if (currentStock < dto.quantity) {
        throw new BadRequestException(
          `Yetersiz stok. Mevcut: ${currentStock}, Talep: ${dto.quantity}`,
        );
      }
    }

    // Use transaction: create movement + update stock + update lastPurchasePrice
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          restaurantId,
          rawMaterialId: dto.rawMaterialId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          type: dto.type,
          supplier: dto.supplier,
          invoiceNo: dto.invoiceNo,
          date: new Date(dto.date),
        },
        include: {
          rawMaterial: {
            select: { id: true, name: true, unit: true },
          },
        },
      });

      // Calculate new stock level
      const currentStock = Number(material.currentStock);
      const newStock =
        dto.type === StockMovementType.IN
          ? currentStock + dto.quantity
          : currentStock - dto.quantity;

      // Build update data
      const updateData: Record<string, unknown> = {
        currentStock: newStock,
      };

      // Update lastPurchasePrice on IN movements
      if (dto.type === StockMovementType.IN && dto.unitPrice > 0) {
        updateData.lastPurchasePrice = dto.unitPrice;
      }

      await tx.rawMaterial.update({
        where: { id: dto.rawMaterialId },
        data: updateData,
      });

      return movement;
    });
  }
}
