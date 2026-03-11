import { IsNumber, IsDateString, IsString, IsOptional, Min } from 'class-validator';

export class UpdateRevenueDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
