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
import { SimulationService } from './simulation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { UpdateSimulationDto } from './dto/update-simulation.dto';

@Controller('simulations')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(MemberRole.ADMIN)
export class SimulationController {
  constructor(private readonly service: SimulationService) {}

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.service.findAll(restaurantId);
  }

  @Get(':id')
  findById(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(id, restaurantId);
  }

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body() dto: CreateSimulationDto,
  ) {
    return this.service.create(restaurantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSimulationDto,
  ) {
    return this.service.update(id, restaurantId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(id, restaurantId);
  }

  @Post(':id/expenses')
  addExpense(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() data: { name: string; amount: number; type?: string },
  ) {
    return this.service.addExpense(id, restaurantId, { name: data.name, amount: data.amount, type: data.type || 'FIXED' });
  }

  @Delete(':id/expenses/:expenseId')
  removeExpense(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.service.removeExpense(id, expenseId, restaurantId);
  }

  @Post(':id/revenues')
  addRevenue(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() data: { name: string; amount: number },
  ) {
    return this.service.addRevenue(id, restaurantId, data);
  }

  @Delete(':id/revenues/:productId')
  removeRevenue(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.service.removeRevenue(id, productId, restaurantId);
  }
}
