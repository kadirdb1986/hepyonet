import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  getMyRestaurant(@CurrentUser('restaurantId') restaurantId: string) {
    return this.restaurantService.findById(restaurantId);
  }

  @Patch()
  @Roles(Role.ADMIN)
  updateRestaurant(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(restaurantId, dto);
  }

  @Patch('settings')
  @Roles(Role.ADMIN, Role.STOCK_MANAGER)
  updateSettings(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantSettingsDto,
  ) {
    return this.restaurantService.updateSettings(restaurantId, dto);
  }
}
