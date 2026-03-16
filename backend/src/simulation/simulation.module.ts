import { Module } from '@nestjs/common';
import { ProductModule } from '../product/product.module';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { FixedExpenseController } from './fixed-expense.controller';
import { FixedExpenseService } from './fixed-expense.service';
import { FixedRevenueController } from './fixed-revenue.controller';
import { FixedRevenueService } from './fixed-revenue.service';

@Module({
  imports: [ProductModule],
  controllers: [SimulationController, FixedExpenseController, FixedRevenueController],
  providers: [SimulationService, FixedExpenseService, FixedRevenueService],
})
export class SimulationModule {}
