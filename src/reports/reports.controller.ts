import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TaskKind } from 'db/models/Task';

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
      this.reportsService.enqueueReportTask(TaskKind.GenerateReportAccount),
      this.reportsService.enqueueReportTask(TaskKind.GenerateReportYearly),
      this.reportsService.enqueueReportTask(
        TaskKind.GenerateReportFinancialStatements,
      ),
    ]);
    return { message: 'finished' };
  }
}
