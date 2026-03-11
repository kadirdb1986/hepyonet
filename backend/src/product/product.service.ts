import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    const products = await this.prisma.product.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        ingredients: {
          include: {
            rawMaterial: { select: { id: true, name: true, unit: true, lastPurchasePrice: true } },
            subProduct: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Attach computed cost to each product
    const productsWithCost = await Promise.all(
      products.map(async (product) => {
        const cost = await this.calculateCost(product.id, restaurantId);
        const price = Number(product.price);
        const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
        return {
          ...product,
          calculatedCost: cost,
          profitMargin: Math.round(profitMargin * 100) / 100,
        };
      }),
    );

    return productsWithCost;
  }

  async findOne(id: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: {
        category: { select: { id: true, name: true } },
        ingredients: {
          include: {
            rawMaterial: {
              select: {
                id: true,
                name: true,
                unit: true,
                lastPurchasePrice: true,
                currentStock: true,
              },
            },
            subProduct: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const cost = await this.calculateCost(id, restaurantId);
    const price = Number(product.price);
    const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;

    // Attach calculatedCost to each sub-product ingredient
    const ingredientsWithCost = await Promise.all(
      product.ingredients.map(async (ing) => {
        if (ing.subProductId && ing.subProduct) {
          const subCost = await this.calculateCost(ing.subProductId, restaurantId);
          return {
            ...ing,
            subProduct: {
              ...ing.subProduct,
              calculatedCost: subCost,
            },
          };
        }
        return ing;
      }),
    );

    return {
      ...product,
      ingredients: ingredientsWithCost,
      calculatedCost: cost,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }

  async create(restaurantId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        restaurantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        image: dto.image,
        price: dto.price ?? 0,
        isMenuItem: dto.isMenuItem ?? false,
        isComposite: dto.isComposite ?? false,
        categoryId: dto.categoryId || null,
      },
    });

    // Auto-create MenuItem when product is marked for menu
    if (product.isMenuItem) {
      const maxOrder = await this.prisma.menuItem.aggregate({
        where: { restaurantId },
        _max: { displayOrder: true },
      });
      await this.prisma.menuItem.create({
        data: {
          productId: product.id,
          restaurantId,
          displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        },
      });
    }

    return product;
  }

  async update(id: string, restaurantId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.isMenuItem !== undefined && { isMenuItem: dto.isMenuItem }),
        ...(dto.isComposite !== undefined && { isComposite: dto.isComposite }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
      },
    });

    // Sync MenuItem record when isMenuItem changes
    if (dto.isMenuItem !== undefined && dto.isMenuItem !== product.isMenuItem) {
      if (dto.isMenuItem) {
        // Create MenuItem if not exists
        const existing = await this.prisma.menuItem.findUnique({ where: { productId: id } });
        if (!existing) {
          const maxOrder = await this.prisma.menuItem.aggregate({
            where: { restaurantId },
            _max: { displayOrder: true },
          });
          await this.prisma.menuItem.create({
            data: {
              productId: id,
              restaurantId,
              displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
            },
          });
        }
      } else {
        // Remove MenuItem when unchecked
        await this.prisma.menuItem.deleteMany({ where: { productId: id } });
      }
    }

    return updated;
  }

  async remove(id: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    // Delete associated menu item, ingredients, then the product
    await this.prisma.menuItem.deleteMany({ where: { productId: id } });
    await this.prisma.productIngredient.deleteMany({
      where: { productId: id },
    });

    return this.prisma.product.delete({ where: { id } });
  }

  // --- Ingredient management ---

  async addIngredient(productId: string, restaurantId: string, dto: CreateIngredientDto) {
    // Validate the product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    // Must specify exactly one of rawMaterialId or subProductId
    if (!dto.rawMaterialId && !dto.subProductId) {
      throw new BadRequestException('rawMaterialId veya subProductId belirtilmelidir');
    }
    if (dto.rawMaterialId && dto.subProductId) {
      throw new BadRequestException('Ayni anda hem rawMaterialId hem subProductId belirtilemez');
    }

    // Validate referenced entity exists and belongs to the restaurant
    if (dto.rawMaterialId) {
      const material = await this.prisma.rawMaterial.findFirst({
        where: { id: dto.rawMaterialId, restaurantId },
      });
      if (!material) {
        throw new NotFoundException('Ham madde bulunamadi');
      }
    }

    if (dto.subProductId) {
      // Prevent self-reference
      if (dto.subProductId === productId) {
        throw new BadRequestException('Urun kendisini icerik olarak iceremez');
      }

      const subProduct = await this.prisma.product.findFirst({
        where: { id: dto.subProductId, restaurantId },
      });
      if (!subProduct) {
        throw new NotFoundException('Alt urun bulunamadi');
      }

      // Check for circular dependency
      const hasCircular = await this.checkCircularDependency(
        dto.subProductId,
        productId,
        restaurantId,
      );
      if (hasCircular) {
        throw new BadRequestException('Dongusel bagimlilk tespit edildi. Bu alt urun eklenemez.');
      }
    }

    return this.prisma.productIngredient.create({
      data: {
        productId,
        rawMaterialId: dto.rawMaterialId || null,
        subProductId: dto.subProductId || null,
        quantity: dto.quantity,
        unit: dto.unit,
      },
      include: {
        rawMaterial: { select: { id: true, name: true, unit: true, lastPurchasePrice: true } },
        subProduct: { select: { id: true, name: true } },
      },
    });
  }

  async updateIngredient(
    productId: string,
    ingredientId: string,
    restaurantId: string,
    dto: Partial<CreateIngredientDto>,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const ingredient = await this.prisma.productIngredient.findFirst({
      where: { id: ingredientId, productId },
    });
    if (!ingredient) {
      throw new NotFoundException('Icerik bulunamadi');
    }

    return this.prisma.productIngredient.update({
      where: { id: ingredientId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
      },
      include: {
        rawMaterial: { select: { id: true, name: true, unit: true, lastPurchasePrice: true } },
        subProduct: { select: { id: true, name: true } },
      },
    });
  }

  async removeIngredient(productId: string, ingredientId: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const ingredient = await this.prisma.productIngredient.findFirst({
      where: { id: ingredientId, productId },
    });
    if (!ingredient) {
      throw new NotFoundException('Icerik bulunamadi');
    }

    return this.prisma.productIngredient.delete({ where: { id: ingredientId } });
  }

  // --- Cost calculation ---

  async calculateCost(
    productId: string,
    restaurantId: string,
    visited: Set<string> = new Set(),
  ): Promise<number> {
    // Guard against circular references
    if (visited.has(productId)) {
      return 0;
    }
    visited.add(productId);

    const ingredients = await this.prisma.productIngredient.findMany({
      where: { productId },
      include: {
        rawMaterial: {
          select: { lastPurchasePrice: true, unit: true },
        },
      },
    });

    let totalCost = 0;

    for (const ingredient of ingredients) {
      const quantity = Number(ingredient.quantity);

      if (ingredient.rawMaterialId && ingredient.rawMaterial) {
        // Raw material cost: quantity * lastPurchasePrice
        // Convert units: ingredient quantity is in the unit specified on the ingredient row
        // lastPurchasePrice is per base unit (KG, LT, ADET)
        const pricePerBaseUnit = Number(ingredient.rawMaterial.lastPurchasePrice);
        const ingredientUnit = ingredient.unit.toUpperCase();
        const materialBaseUnit = ingredient.rawMaterial.unit;

        const convertedQuantity = this.convertToBaseUnit(
          quantity,
          ingredientUnit,
          materialBaseUnit,
        );
        totalCost += convertedQuantity * pricePerBaseUnit;
      } else if (ingredient.subProductId) {
        // Sub-product cost: recursively calculate
        const subCost = await this.calculateCost(
          ingredient.subProductId,
          restaurantId,
          new Set(visited),
        );
        totalCost += subCost * quantity;
      }
    }

    return Math.round(totalCost * 100) / 100;
  }

  async getCostBreakdown(productId: string, restaurantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
      include: {
        ingredients: {
          include: {
            rawMaterial: {
              select: { id: true, name: true, unit: true, lastPurchasePrice: true },
            },
            subProduct: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Urun bulunamadi');
    }

    const breakdown = await Promise.all(
      product.ingredients.map(async (ingredient) => {
        const quantity = Number(ingredient.quantity);

        if (ingredient.rawMaterialId && ingredient.rawMaterial) {
          const pricePerBaseUnit = Number(ingredient.rawMaterial.lastPurchasePrice);
          const convertedQuantity = this.convertToBaseUnit(
            quantity,
            ingredient.unit.toUpperCase(),
            ingredient.rawMaterial.unit,
          );
          const cost = Math.round(convertedQuantity * pricePerBaseUnit * 100) / 100;

          return {
            type: 'raw_material' as const,
            id: ingredient.rawMaterial.id,
            name: ingredient.rawMaterial.name,
            quantity,
            unit: ingredient.unit,
            unitPrice: pricePerBaseUnit,
            baseUnit: ingredient.rawMaterial.unit,
            cost,
          };
        } else if (ingredient.subProductId && ingredient.subProduct) {
          const subCost = await this.calculateCost(
            ingredient.subProductId,
            restaurantId,
          );
          const cost = Math.round(subCost * quantity * 100) / 100;

          return {
            type: 'sub_product' as const,
            id: ingredient.subProduct.id,
            name: ingredient.subProduct.name,
            quantity,
            unit: ingredient.unit,
            unitCost: subCost,
            cost,
          };
        }

        return null;
      }),
    );

    const totalCost = breakdown.reduce((sum, item) => sum + (item?.cost ?? 0), 0);
    const price = Number(product.price);
    const profitMargin = price > 0 ? ((price - totalCost) / price) * 100 : 0;

    return {
      productId: product.id,
      productName: product.name,
      price,
      totalCost: Math.round(totalCost * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      ingredients: breakdown.filter(Boolean),
    };
  }

  // --- Private helpers ---

  /**
   * Convert a quantity from one unit to the base unit for price calculation.
   * lastPurchasePrice is stored per base unit (KG, LT, ADET).
   * GR -> KG: divide by 1000
   * ML -> LT: divide by 1000
   * Same unit: no conversion
   */
  private convertToBaseUnit(
    quantity: number,
    ingredientUnit: string,
    materialBaseUnit: string,
  ): number {
    const from = ingredientUnit.toUpperCase();
    const to = materialBaseUnit.toUpperCase();

    if (from === to) return quantity;

    // GR to KG
    if (from === 'GR' && to === 'KG') return quantity / 1000;
    // KG to GR
    if (from === 'KG' && to === 'GR') return quantity * 1000;
    // ML to LT
    if (from === 'ML' && to === 'LT') return quantity / 1000;
    // LT to ML
    if (from === 'LT' && to === 'ML') return quantity * 1000;

    // No known conversion — assume same unit
    return quantity;
  }

  /**
   * Check for circular dependency: does `subProductId` eventually reference `targetProductId`?
   */
  private async checkCircularDependency(
    subProductId: string,
    targetProductId: string,
    restaurantId: string,
    visited: Set<string> = new Set(),
  ): Promise<boolean> {
    if (visited.has(subProductId)) return false;
    visited.add(subProductId);

    const ingredients = await this.prisma.productIngredient.findMany({
      where: { productId: subProductId },
      select: { subProductId: true },
    });

    for (const ing of ingredients) {
      if (!ing.subProductId) continue;
      if (ing.subProductId === targetProductId) return true;
      const found = await this.checkCircularDependency(
        ing.subProductId,
        targetProductId,
        restaurantId,
        visited,
      );
      if (found) return true;
    }

    return false;
  }
}
