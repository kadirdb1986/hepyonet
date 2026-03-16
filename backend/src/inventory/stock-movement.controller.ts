import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StockMovementService } from './stock-movement.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard, RestaurantGuard)
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Get()
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.stockMovementService.findAll(restaurantId);
  }

  @Get('by-material/:rawMaterialId')
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  findByRawMaterial(
    @Param('rawMaterialId') rawMaterialId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.stockMovementService.findByRawMaterial(rawMaterialId, restaurantId);
  }

  @Post()
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.stockMovementService.create(restaurantId, dto);
  }
}
