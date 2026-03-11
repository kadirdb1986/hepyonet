import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class MenuOrderItem {
  @IsString()
  menuItemId: string;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class UpdateMenuOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuOrderItem)
  items: MenuOrderItem[];
}
