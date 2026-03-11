import { IsString, Matches, IsOptional } from 'class-validator';

export class MonthlyReportQueryDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month: string;
}

export class WeeklyReportQueryDto {
  @IsString()
  @Matches(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, {
    message: 'week must be in YYYY-WXX format',
  })
  week: string;
}

export class CompareQueryDto {
  @IsString()
  periods: string;

  @IsOptional()
  @IsString()
  type?: 'monthly' | 'weekly';
}
