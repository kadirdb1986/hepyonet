import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';

@Module({
  controllers: [ExpenseController, RevenueController],
  providers: [ExpenseService, RevenueService],
  exports: [ExpenseService, RevenueService],
})
export class FinanceModule {}
