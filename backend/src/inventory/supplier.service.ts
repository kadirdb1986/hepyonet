import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.supplier.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(restaurantId: string, name: string, description?: string, deliveryType?: string, phone?: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Tedarikci adi bos olamaz');
    }

    const existing = await this.prisma.supplier.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (existing) {
      throw new BadRequestException('Bu isimde bir tedarikci zaten var');
    }

    return this.prisma.supplier.create({
      data: {
        restaurantId,
        name: trimmed,
        description: description?.trim() || null,
        deliveryType: deliveryType || null,
        phone: phone?.trim() || null,
      },
    });
  }

  async update(restaurantId: string, id: string, name: string, description?: string, deliveryType?: string, phone?: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Tedarikci adi bos olamaz');
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, restaurantId },
    });

    if (!supplier) {
      throw new NotFoundException('Tedarikci bulunamadi');
    }

    const duplicate = await this.prisma.supplier.findUnique({
      where: { restaurantId_name: { restaurantId, name: trimmed } },
    });

    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException('Bu isimde bir tedarikci zaten var');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: trimmed,
        description: description?.trim() || null,
        deliveryType: deliveryType || null,
        phone: phone?.trim() || null,
      },
    });
  }

  async remove(restaurantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, restaurantId },
    });

    if (!supplier) {
      throw new NotFoundException('Tedarikci bulunamadi');
    }

    // Bağlı stok kalemlerinin supplierId'sini null yap
    await this.prisma.rawMaterial.updateMany({
      where: { supplierId: id },
      data: { supplierId: null },
    });

    await this.prisma.supplier.delete({ where: { id } });
    return { message: 'Tedarikci silindi' };
  }
}
