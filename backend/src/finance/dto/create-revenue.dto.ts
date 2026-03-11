import { IsNumber, IsDateString, IsString, IsOptional, Min } from 'class-validator';

export class CreateRevenueDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
