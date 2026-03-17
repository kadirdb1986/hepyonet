import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { UpdateSimulationDto } from './dto/update-simulation.dto';
import { SimExpenseType } from '@prisma/client';

@Injectable()
export class SimulationService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
  ) {}

  async findAll(restaurantId: string) {
    return this.prisma.simulation.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        month: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string, restaurantId: string) {
    const simulation = await this.prisma.simulation.findFirst({
      where: { id, restaurantId },
      include: {
        products: true,
        expenses: true,
        dayWeights: true,
      },
    });

    if (!simulation) {
      throw new NotFoundException('Simulasyon bulunamadi');
    }

    return simulation;
  }

  async create(restaurantId: string, dto: CreateSimulationDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the simulation record
      const simulation = await tx.simulation.create({
        data: {
          restaurantId,
          name: dto.name,
          month: dto.month,
        },
      });

      // 2. Get fixed expenses -> create FIXED expenses
      const fixedExpenses = await tx.simFixedExpense.findMany({
        where: { restaurantId },
        orderBy: { sortOrder: 'asc' },
      });

      if (fixedExpenses.length > 0) {
        await tx.simulationExpense.createMany({
          data: fixedExpenses.map((fe) => ({
            simulationId: simulation.id,
            name: fe.name,
            amount: fe.amount,
            type: SimExpenseType.FIXED,
          })),
        });
      }

      // 4. Get fixed revenues -> create SimulationProduct records + FOOD_COST expenses
      const fixedRevenues = await tx.simFixedRevenue.findMany({
        where: { restaurantId },
        include: {
          product: {
            select: { id: true, name: true, price: true },
          },
        },
      });

      if (fixedRevenues.length > 0) {
        // Calculate costs for each product (outside transaction since it's read-only)
        const productData = await Promise.all(
          fixedRevenues.map(async (fr) => {
            const costPrice = await this.productService.calculateCost(
              fr.productId,
              restaurantId,
            );
            return {
              simulationId: simulation.id,
              productId: fr.productId,
              productName: fr.product.name,
              quantity: fr.quantity,
              salePrice: fr.product.price,
              costPrice,
            };
          }),
        );

        await tx.simulationProduct.createMany({
          data: productData,
        });

        // Create FOOD_COST expenses for each product
        await tx.simulationExpense.createMany({
          data: productData.map((pd) => ({
            simulationId: simulation.id,
            name: `${pd.productName} gıda maliyeti`,
            amount: pd.quantity * pd.costPrice,
            type: SimExpenseType.FOOD_COST,
          })),
        });
      }

      // Create default day weights
      const defaultWeights = [
        { day: 'Pazartesi', weight: 10 },
        { day: 'Sali', weight: 12 },
        { day: 'Carsamba', weight: 13 },
        { day: 'Persembe', weight: 14 },
        { day: 'Cuma', weight: 17 },
        { day: 'Cumartesi', weight: 18 },
        { day: 'Pazar', weight: 16 },
      ];
      await tx.simulationDayWeight.createMany({
        data: defaultWeights.map((w) => ({
          simulationId: simulation.id,
          day: w.day,
          weight: w.weight,
        })),
      });

      // Return the full simulation
      return tx.simulation.findFirst({
        where: { id: simulation.id },
        include: {
          products: true,
          expenses: true,
          dayWeights: true,
        },
      });
    });
  }

  async update(
    id: string,
    restaurantId: string,
    dto: UpdateSimulationDto,
  ) {
    const simulation = await this.prisma.simulation.findFirst({
      where: { id, restaurantId },
    });

    if (!simulation) {
      throw new NotFoundException('Simulasyon bulunamadi');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update simulation-level fields (name, kdvRate, incomeTaxRate)
      if (dto.name !== undefined || dto.kdvRate !== undefined || dto.incomeTaxRate !== undefined) {
        await tx.simulation.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.kdvRate !== undefined && { kdvRate: dto.kdvRate }),
            ...(dto.incomeTaxRate !== undefined && {
              incomeTaxRate: dto.incomeTaxRate,
            }),
          },
        });
      }

      // Update products
      if (dto.products && dto.products.length > 0) {
        for (const product of dto.products) {
          await tx.simulationProduct.update({
            where: { id: product.id },
            data: {
              ...(product.quantity !== undefined && {
                quantity: product.quantity,
              }),
              ...(product.salePrice !== undefined && {
                salePrice: product.salePrice,
              }),
              ...(product.costPrice !== undefined && {
                costPrice: product.costPrice,
              }),
            },
          });
        }

        // Recalculate FOOD_COST expenses: delete old ones, create new ones
        await tx.simulationExpense.deleteMany({
          where: { simulationId: id, type: SimExpenseType.FOOD_COST },
        });

        const updatedProducts = await tx.simulationProduct.findMany({
          where: { simulationId: id },
        });

        if (updatedProducts.length > 0) {
          await tx.simulationExpense.createMany({
            data: updatedProducts.map((p) => ({
              simulationId: id,
              name: `${p.productName} gıda maliyeti`,
              amount: Number(p.quantity) * Number(p.costPrice),
              type: SimExpenseType.FOOD_COST,
            })),
          });
        }
      }

      // Update FIXED expenses
      if (dto.expenses && dto.expenses.length > 0) {
        for (const expense of dto.expenses) {
          await tx.simulationExpense.update({
            where: { id: expense.id },
            data: {
              ...(expense.amount !== undefined && { amount: expense.amount }),
            },
          });
        }
      }

      // Update day weights
      if (dto.dayWeights && dto.dayWeights.length > 0) {
        for (const dw of dto.dayWeights) {
          await tx.simulationDayWeight.upsert({
            where: { simulationId_day: { simulationId: id, day: dw.day } },
            update: { weight: dw.weight },
            create: { simulationId: id, day: dw.day, weight: dw.weight },
          });
        }
      }

      // Return the updated simulation
      return tx.simulation.findFirst({
        where: { id },
        include: {
          products: true,
          expenses: true,
          dayWeights: true,
        },
      });
    });
  }

  async remove(id: string, restaurantId: string) {
    const simulation = await this.prisma.simulation.findFirst({
      where: { id, restaurantId },
    });

    if (!simulation) {
      throw new NotFoundException('Simulasyon bulunamadi');
    }

    await this.prisma.simulation.delete({ where: { id } });
    return { message: 'Simulasyon silindi' };
  }

  async addExpense(id: string, restaurantId: string, data: { name: string; amount: number; type: string }) {
    const simulation = await this.prisma.simulation.findFirst({ where: { id, restaurantId } });
    if (!simulation) throw new NotFoundException('Simulasyon bulunamadi');

    return this.prisma.simulationExpense.create({
      data: {
        simulationId: id,
        name: data.name,
        amount: data.amount,
        type: (data.type as SimExpenseType) || SimExpenseType.OTHER,
      },
    });
  }

  async removeExpense(id: string, expenseId: string, restaurantId: string) {
    const simulation = await this.prisma.simulation.findFirst({ where: { id, restaurantId } });
    if (!simulation) throw new NotFoundException('Simulasyon bulunamadi');

    await this.prisma.simulationExpense.delete({ where: { id: expenseId } });
    return { message: 'Gider silindi' };
  }

  async addRevenue(id: string, restaurantId: string, data: { name: string; amount: number }) {
    const simulation = await this.prisma.simulation.findFirst({ where: { id, restaurantId } });
    if (!simulation) throw new NotFoundException('Simulasyon bulunamadi');

    return this.prisma.simulationProduct.create({
      data: {
        simulationId: id,
        productId: `manual-${Date.now()}`,
        productName: data.name,
        quantity: 1,
        salePrice: data.amount,
        costPrice: 0,
      },
    });
  }

  async removeRevenue(id: string, productId: string, restaurantId: string) {
    const simulation = await this.prisma.simulation.findFirst({ where: { id, restaurantId } });
    if (!simulation) throw new NotFoundException('Simulasyon bulunamadi');

    // Also remove related FOOD_COST expense
    const product = await this.prisma.simulationProduct.findUnique({ where: { id: productId } });
    if (product) {
      await this.prisma.simulationExpense.deleteMany({
        where: {
          simulationId: id,
          name: { contains: product.productName },
          type: SimExpenseType.FOOD_COST,
        },
      });
    }

    await this.prisma.simulationProduct.delete({ where: { id: productId } });
    return { message: 'Gelir silindi' };
  }
}
