import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.productService.findAll(restaurantId);
  }

  @Get(':id')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  findOne(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.findOne(id, restaurantId);
  }

  @Get(':id/cost')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  getCostBreakdown(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.getCostBreakdown(id, restaurantId);
  }

  @Post()
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(restaurantId, dto);
  }

  @Patch(':id')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.remove(id, restaurantId);
  }

  // --- Ingredient endpoints ---

  @Post(':id/ingredients')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  addIngredient(
    @Param('id') productId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateIngredientDto,
  ) {
    return this.productService.addIngredient(productId, restaurantId, dto);
  }

  @Patch(':id/ingredients/:ingredientId')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  updateIngredient(
    @Param('id') productId: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: Partial<CreateIngredientDto>,
  ) {
    return this.productService.updateIngredient(
      productId,
      ingredientId,
      restaurantId,
      dto,
    );
  }

  @Delete(':id/ingredients/:ingredientId')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  removeIngredient(
    @Param('id') productId: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.productService.removeIngredient(productId, ingredientId, restaurantId);
  }
}
