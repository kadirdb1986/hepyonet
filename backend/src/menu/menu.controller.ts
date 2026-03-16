import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  getMenuItems(@CurrentUser('restaurantId') restaurantId: string) {
    return this.menuService.getMenuItems(restaurantId);
  }

  @Patch('order')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  updateOrder(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateMenuOrderDto,
  ) {
    return this.menuService.updateOrder(restaurantId, dto);
  }

  @Patch(':productId/availability')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.MENU_MANAGER)
  toggleAvailability(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('productId') productId: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.menuService.toggleAvailability(restaurantId, productId, dto);
  }

  @Get('public/:slug')
  getPublicMenu(@Param('slug') slug: string) {
    return this.menuService.getPublicMenu(slug);
  }
}
