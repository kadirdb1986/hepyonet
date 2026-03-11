import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { MaterialUnit, MaterialType } from '@prisma/client';

export class CreateRawMaterialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MaterialType)
  @IsOptional()
  type?: MaterialType = MaterialType.GIDA;

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
}
