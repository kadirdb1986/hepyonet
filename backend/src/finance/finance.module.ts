import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { ExpenseCategoryController } from './expense-category.controller';
import { ExpenseCategoryService } from './expense-category.service';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';

@Module({
  controllers: [ExpenseController, ExpenseCategoryController, RevenueController],
  providers: [ExpenseService, ExpenseCategoryService, RevenueService],
  exports: [ExpenseService, ExpenseCategoryService, RevenueService],
})
export class FinanceModule {}
