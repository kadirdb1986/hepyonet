import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { MaterialUnit } from '@prisma/client';

export class CreateRawMaterialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  typeId?: string;

  @IsEnum(MaterialUnit)
  unit: MaterialUnit;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentStock?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lastPurchasePrice?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockLevel?: number = 0;

  @IsString()
  @IsOptional()
  supplierId?: string | null;
}
