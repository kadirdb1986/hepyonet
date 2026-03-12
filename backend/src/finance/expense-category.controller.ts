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
import { ExpenseCategoryService } from './expense-category.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('expense-categories')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ACCOUNTANT)
export class ExpenseCategoryController {
  constructor(private readonly service: ExpenseCategoryService) {}

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.service.findAll(restaurantId);
  }

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body('name') name: string,
  ) {
    return this.service.create(restaurantId, name);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.service.update(restaurantId, id, name);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(restaurantId, id);
  }
}
