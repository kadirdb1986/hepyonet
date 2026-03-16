import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  // --- Non-restaurant-scoped routes (only JwtAuthGuard) ---

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRestaurantDto,
  ) {
    return this.restaurantService.create(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyRestaurants(@CurrentUser('id') userId: string) {
    return this.restaurantService.getMyRestaurants(userId);
  }

  // --- Restaurant-scoped routes (need x-restaurant-id header) ---

  @Get('current')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  getCurrent(@CurrentUser('restaurantId') restaurantId: string) {
    return this.restaurantService.findById(restaurantId);
  }

  @Patch('current')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  updateCurrent(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(restaurantId, dto);
  }

  @Patch('current/settings')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.STOCK_MANAGER)
  updateSettings(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantSettingsDto,
  ) {
    return this.restaurantService.updateSettings(restaurantId, dto);
  }

  // --- Member management ---

  @Get('current/members')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  getMembers(@CurrentUser('restaurantId') restaurantId: string) {
    return this.restaurantService.getMembers(restaurantId);
  }

  @Post('current/members')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  addMember(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.restaurantService.addMember(restaurantId, dto);
  }

  @Patch('current/members/:userId/role')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  updateMemberRole(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.restaurantService.updateMemberRole(restaurantId, userId, dto);
  }

  @Delete('current/members/:userId')
  @UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  deactivateMember(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('userId') userId: string,
  ) {
    return this.restaurantService.deactivateMember(restaurantId, userId);
  }

  @Post('current/transfer-ownership')
  @UseGuards(JwtAuthGuard, RestaurantGuard)
  transferOwnership(
    @CurrentUser('restaurantId') restaurantId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.restaurantService.transferOwnership(restaurantId, currentUserId, dto);
  }
}
