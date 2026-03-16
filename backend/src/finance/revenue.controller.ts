import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('revenues')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(MemberRole.ADMIN, MemberRole.ACCOUNTANT)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateRevenueDto,
  ) {
    return this.revenueService.create(restaurantId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    return this.revenueService.findAll(restaurantId, {
      startDate,
      endDate,
      month,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.revenueService.findOne(restaurantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRevenueDto,
  ) {
    return this.revenueService.update(restaurantId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.revenueService.remove(restaurantId, id);
  }

  @Get('summary/monthly')
  getMonthlySummary(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('month') month: string,
  ) {
    return this.revenueService.getMonthlySummary(restaurantId, month);
  }
}
