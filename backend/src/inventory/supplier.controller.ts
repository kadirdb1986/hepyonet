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
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STOCK_MANAGER)
export class SupplierController {
  constructor(private readonly service: SupplierService) {}

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.service.findAll(restaurantId);
  }

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.service.create(restaurantId, name, description);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.service.update(restaurantId, id, name, description);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(restaurantId, id);
  }
}
