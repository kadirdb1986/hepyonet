import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
    const simulations = await this.prisma.simulation.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        products: true,
        expenses: true,
      },
    });

    return simulations.map((sim) => {
      const totalRevenue = sim.products.reduce((sum, p) => sum + Number(p.quantity) * Number(p.salePrice), 0);
      const totalExpense = sim.expenses
        .filter((e) => e.type !== 'FOOD_COST')
        .reduce((sum, e) => sum + Number(e.amount), 0)
        + sim.products.reduce((sum, p) => sum + Number(p.quantity) * Number(p.costPrice), 0);
      const grossProfit = totalRevenue - totalExpense;
      const kdvRate = Number(sim.kdvRate);
      const kdvNet = grossProfit * kdvRate / (100 + kdvRate);
      const profitBeforeTax = grossProfit - kdvNet;
      const incomeTaxRate = Number(sim.incomeTaxRate);
      const incomeTax = Math.max(0, profitBeforeTax * incomeTaxRate / 100);
      const netProfit = profitBeforeTax - incomeTax;

      return {
        id: sim.id,
        name: sim.name,
        month: sim.month,
        createdAt: sim.createdAt,
        totalRevenue: Math.round(totalRevenue),
        netProfit: Math.round(netProfit),
      };
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
      // Update simulation-level fields
      await tx.simulation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.kdvRate !== undefined && { kdvRate: dto.kdvRate }),
          ...(dto.incomeTaxRate !== undefined && { incomeTaxRate: dto.incomeTaxRate }),
        },
      });

      // Replace products (delete all, re-create from revenues)
      if (dto.revenues) {
        await tx.simulationProduct.deleteMany({ where: { simulationId: id } });
        if (dto.revenues.length > 0) {
          await tx.simulationProduct.createMany({
            data: dto.revenues.map((r) => ({
              simulationId: id,
              productId: randomUUID(),
              productName: r.name,
              quantity: r.quantity,
              salePrice: r.unitPrice,
              costPrice: r.costPrice || 0,
            })),
          });
        }
      }

      // Replace expenses (delete all, re-create)
      if (dto.expenses) {
        await tx.simulationExpense.deleteMany({ where: { simulationId: id } });
        if (dto.expenses.length > 0) {
          await tx.simulationExpense.createMany({
            data: dto.expenses.map((e) => ({
              simulationId: id,
              name: e.name,
              amount: e.amount,
              type: e.type === 'food_cost' ? SimExpenseType.FOOD_COST : SimExpenseType.FIXED,
            })),
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

      return tx.simulation.findFirst({
        where: { id },
        include: { products: true, expenses: true, dayWeights: true },
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

  async duplicate(id: string, restaurantId: string, newName: string) {
    const source = await this.prisma.simulation.findFirst({
      where: { id, restaurantId },
      include: { products: true, expenses: true, dayWeights: true },
    });

    if (!source) throw new NotFoundException('Simulasyon bulunamadi');

    return this.prisma.$transaction(async (tx) => {
      const sim = await tx.simulation.create({
        data: {
          restaurantId,
          name: newName,
          month: source.month,
          kdvRate: source.kdvRate,
          incomeTaxRate: source.incomeTaxRate,
        },
      });

      if (source.products.length > 0) {
        await tx.simulationProduct.createMany({
          data: source.products.map((p) => ({
            simulationId: sim.id,
            productId: p.productId,
            productName: p.productName,
            quantity: p.quantity,
            salePrice: p.salePrice,
            costPrice: p.costPrice,
          })),
        });
      }

      if (source.expenses.length > 0) {
        await tx.simulationExpense.createMany({
          data: source.expenses.map((e) => ({
            simulationId: sim.id,
            name: e.name,
            amount: e.amount,
            type: e.type,
          })),
        });
      }

      if (source.dayWeights.length > 0) {
        await tx.simulationDayWeight.createMany({
          data: source.dayWeights.map((dw) => ({
            simulationId: sim.id,
            day: dw.day,
            weight: dw.weight,
          })),
        });
      }

      return tx.simulation.findFirst({
        where: { id: sim.id },
        include: { products: true, expenses: true, dayWeights: true },
      });
    });
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
