import {
  Controller, Get, Post, Query, Body, UseGuards, Req, Res, BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantGuard } from '../common/guards/restaurant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MemberRole } from '@prisma/client';
import { ReportService } from './report.service';
import { MonthlyReportQueryDto, WeeklyReportQueryDto, CompareQueryDto } from './dto/report-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RestaurantGuard, RolesGuard)
@Roles(MemberRole.ADMIN, MemberRole.ACCOUNTANT)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('monthly')
  async getMonthlyReport(@Query() query: MonthlyReportQueryDto, @Req() req: any) {
    return this.reportService.getMonthlyReport(req.user.restaurantId, query.month);
  }

  @Get('weekly')
  async getWeeklyReport(@Query() query: WeeklyReportQueryDto, @Req() req: any) {
    return this.reportService.getWeeklyReport(req.user.restaurantId, query.week);
  }

  @Get('compare')
  async getComparison(@Query() query: CompareQueryDto, @Req() req: any) {
    const periods = query.periods.split(',').map((p) => p.trim());
    if (periods.length < 2) {
      throw new BadRequestException('At least 2 periods are required for comparison');
    }
    return this.reportService.getComparison(req.user.restaurantId, periods, query.type || 'monthly');
  }

  @Post('generate')
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const result = await this.reportService.generateReport(dto);
    if (dto.format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.content);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rapor-${dto.period}.pdf"`);
      res.send(result.content);
    }
  }
}
