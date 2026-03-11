import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, Min, ValidateIf } from 'class-validator';

export class CreateIngredientDto {
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.subProductId)
  rawMaterialId?: string;

  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.rawMaterialId)
  subProductId?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}
