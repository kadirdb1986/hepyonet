import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSimulationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  month: string;
}
