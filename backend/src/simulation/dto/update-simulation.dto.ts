import { IsOptional, IsNumber, IsArray, IsString } from 'class-validator';

export class UpdateSimProductDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;
}

export class UpdateSimExpenseDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class UpdateSimulationDto {
  @IsOptional()
  @IsNumber()
  kdvRate?: number;

  @IsOptional()
  @IsNumber()
  incomeTaxRate?: number;

  @IsOptional()
  @IsArray()
  products?: UpdateSimProductDto[];

  @IsOptional()
  @IsArray()
  expenses?: UpdateSimExpenseDto[];
}
