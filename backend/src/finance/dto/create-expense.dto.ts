import { IsString, IsNotEmpty, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';

export enum ExpenseCategory {
  SALARY = 'SALARY',
  BILL = 'BILL',
  TAX = 'TAX',
  RENT = 'RENT',
  SUPPLIER = 'SUPPLIER',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsDateString()
  paymentDate: string;
}
