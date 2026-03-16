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
import { PositionService } from './position.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@Controller('position-configs')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(MemberRole.ADMIN, MemberRole.HR)
export class PositionController {
  constructor(private readonly service: PositionService) {}

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.service.findAll(restaurantId);
  }

  @Post()
  create(
    @CurrentUser('restaurantId') restaurantId: string,
    @Body('name') name: string,
  ) {
    return this.service.create(restaurantId, name);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.service.update(id, restaurantId, name);
  }

  @Delete(':id')
  remove(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(id, restaurantId);
  }
}
