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
import { RawMaterialService } from './raw-material.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('raw-materials')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
export class RawMaterialController {
  constructor(private readonly rawMaterialService: RawMaterialService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.rawMaterialService.findAll(restaurantId);
  }

  @Get('low-stock')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findLowStock(@CurrentUser('restaurantId') restaurantId: string) {
    return this.rawMaterialService.findLowStockRaw(restaurantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  findOne(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.rawMaterialService.findOne(id, restaurantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateRawMaterialDto,
  ) {
    return this.rawMaterialService.create(restaurantId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRawMaterialDto,
  ) {
    return this.rawMaterialService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.rawMaterialService.remove(id, restaurantId);
  }
}
