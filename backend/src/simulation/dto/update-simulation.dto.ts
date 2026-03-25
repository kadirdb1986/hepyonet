import { IsOptional, IsNumber, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRevenueDto {
  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class UpdateExpenseDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateDayWeightDto {
  @IsString()
  day: string;

  @IsNumber()
  weight: number;
}

export class UpdateSimulationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  kdvRate?: number;

  @IsOptional()
  @IsNumber()
  incomeTaxRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRevenueDto)
  revenues?: UpdateRevenueDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateExpenseDto)
  expenses?: UpdateExpenseDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDayWeightDto)
  dayWeights?: UpdateDayWeightDto[];
}
