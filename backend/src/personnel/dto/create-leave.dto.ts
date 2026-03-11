import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(LeaveType)
  type: LeaveType;

  @IsString()
  @IsOptional()
  notes?: string;
}
