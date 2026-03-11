import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, IsUUID, Min } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class CreateStockMovementDto {
  @IsUUID()
  @IsNotEmpty()
  rawMaterialId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @IsDateString()
  date: string;
}
