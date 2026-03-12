import { IsString, IsOptional, IsNumber, IsDateString, Min, Matches } from 'class-validator';

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'effectiveMonth YYYY-MM formatinda olmalidir' })
  effectiveMonth?: string | null;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'effectiveEndMonth YYYY-MM formatinda olmalidir' })
  effectiveEndMonth?: string | null;
}
