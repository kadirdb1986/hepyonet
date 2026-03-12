import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, Min, Matches } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  category: string;

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
