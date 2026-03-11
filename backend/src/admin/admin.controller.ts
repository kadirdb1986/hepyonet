import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { RestaurantStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('restaurants')
  getRestaurants(@Query('status') status?: RestaurantStatus) {
    return this.adminService.getRestaurants(status);
  }

  @Patch('restaurants/:id/approve')
  approveRestaurant(
    @Param('id') id: string,
    @Body('status') status: RestaurantStatus,
  ) {
    return this.adminService.approveRestaurant(id, status);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
