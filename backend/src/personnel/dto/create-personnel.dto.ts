import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonnelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  surname: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  tcNo?: string;

  @IsString()
  @IsOptional()
  positionId?: string;

  @IsDateString()
  startDate: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salary: number;
}
