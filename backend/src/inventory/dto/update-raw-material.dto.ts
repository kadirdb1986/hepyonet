import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { MaterialUnit } from '@prisma/client';

export class UpdateRawMaterialDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(MaterialUnit)
  @IsOptional()
  unit?: MaterialUnit;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentStock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lastPurchasePrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockLevel?: number;
}
