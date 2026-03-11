import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.userService.create(restaurantId, dto);
  }

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.userService.findAllByRestaurant(restaurantId);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.userService.updateRole(id, restaurantId, dto);
  }

  @Delete(':id')
  deactivate(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.userService.deactivate(id, restaurantId);
  }
}
