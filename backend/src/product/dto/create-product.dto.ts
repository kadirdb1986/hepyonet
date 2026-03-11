import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
  price?: number = 0;

  @IsBoolean()
  @IsOptional()
  isMenuItem?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isComposite?: boolean = false;

  @IsString()
  @IsOptional()
  category?: string;
}
