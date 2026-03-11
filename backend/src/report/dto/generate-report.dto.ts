import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportExpenseItemDto {
  @IsString()
  category: string;

  @IsNumber()
  originalAmount: number;

  @IsNumber()
  amount: number;

  @IsBoolean()
  isEdited: boolean;
}

export class ReportRevenueItemDto {
  @IsString()
  date: string;

  @IsNumber()
  originalAmount: number;

  @IsNumber()
  amount: number;

  @IsBoolean()
  isEdited: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateReportDto {
  @IsString()
  period: string;

  @IsString()
  periodType: 'monthly' | 'weekly';

  @IsString()
  restaurantName: string;

  @IsNumber()
  totalRevenue: number;

  @IsBoolean()
  totalRevenueEdited: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportRevenueItemDto)
  revenues: ReportRevenueItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportExpenseItemDto)
  expenses: ReportExpenseItemDto[];

  @IsNumber()
  totalExpense: number;

  @IsBoolean()
  totalExpenseEdited: boolean;

  @IsNumber()
  taxAmount: number;

  @IsBoolean()
  taxEdited: boolean;

  @IsNumber()
  netProfit: number;

  @IsBoolean()
  netProfitEdited: boolean;

  @IsString()
  format: 'pdf' | 'html';
}
