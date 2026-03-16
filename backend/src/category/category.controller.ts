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
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';
import { IsString, IsNotEmpty } from 'class-validator';

class CategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.categoryService.findAll(restaurantId);
  }

  @Post()
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CategoryDto,
  ) {
    return this.categoryService.create(restaurantId, dto.name);
  }

  @Patch('order')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  updateOrder(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: { items: { id: string; displayOrder: number }[] },
  ) {
    return this.categoryService.updateOrder(restaurantId, dto.items);
  }

  @Patch(':id')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CategoryDto,
  ) {
    return this.categoryService.update(id, restaurantId, dto.name);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.categoryService.remove(id, restaurantId);
  }
}
