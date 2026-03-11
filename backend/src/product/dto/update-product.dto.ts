import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isMenuItem?: boolean;

  @IsBoolean()
  @IsOptional()
  isComposite?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
