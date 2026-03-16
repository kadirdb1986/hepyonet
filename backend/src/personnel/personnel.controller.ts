import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('personnel')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(MemberRole.ADMIN, MemberRole.HR)
export class PersonnelController {
  constructor(private personnelService: PersonnelService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreatePersonnelDto,
  ) {
    return this.personnelService.create(restaurantId, dto);
  }

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.personnelService.findAll(restaurantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.personnelService.findById(id, restaurantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdatePersonnelDto,
  ) {
    return this.personnelService.update(id, restaurantId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.personnelService.remove(id, restaurantId);
  }

  @Post(':id/leaves')
  createLeave(
    @Param('id') personnelId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.personnelService.createLeave(personnelId, restaurantId, dto);
  }

  @Get(':id/leaves')
  getLeaves(
    @Param('id') personnelId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ) {
    return this.personnelService.getLeaves(personnelId, restaurantId);
  }

  @Patch(':id/leaves/:leaveId')
  updateLeaveStatus(
    @Param('id') personnelId: string,
    @Param('leaveId') leaveId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: UpdateLeaveStatusDto,
  ) {
    return this.personnelService.updateLeaveStatus(personnelId, leaveId, restaurantId, dto);
  }

  @Get(':id/work-days')
  getWorkDays(
    @Param('id') personnelId: string,
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('month') month?: string,
  ) {
    return this.personnelService.getWorkDays(personnelId, restaurantId, month);
  }
}
