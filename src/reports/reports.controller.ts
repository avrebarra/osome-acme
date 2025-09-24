import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  async report() {
    return await this.reportsService.getReportStates();
  }

  @Post()
  @HttpCode(201)
  async generate() {
    await Promise.all([
      this.reportsService.generateReportAccounts(),
      this.reportsService.generateReportYearly(),
      this.reportsService.generateReportFinancialStatements(),
    ]);
    return { message: 'finished' };
  }
}
