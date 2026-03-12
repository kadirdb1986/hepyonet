import { IsString, IsNotEmpty, IsNumber, IsEnum, IsDateString, IsOptional, Min, Matches } from 'class-validator';

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

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'effectiveMonth YYYY-MM formatinda olmalidir' })
  effectiveMonth?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'effectiveEndMonth YYYY-MM formatinda olmalidir' })
  effectiveEndMonth?: string;
}
