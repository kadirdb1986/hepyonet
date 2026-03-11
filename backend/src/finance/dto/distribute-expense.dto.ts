import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';

export enum DistributionType {
  NONE = 'NONE',
  EQUAL = 'EQUAL',
  REVENUE_BASED = 'REVENUE_BASED',
}

export class DistributeExpenseDto {
  @IsEnum(DistributionType)
  distributionType: DistributionType;

  @IsInt()
  @Min(2)
  @Max(24)
  @IsOptional()
  distributionMonths?: number;
}
