import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_REPORT_PROCESSING,
  QueueReportProcessingPayload,
} from './reports.constants';
import { ReportsService } from './reports.service';

@Processor(QUEUE_REPORT_PROCESSING)
export class WorkerGenerateReport extends WorkerHost {
  private readonly logger = new Logger(WorkerGenerateReport.name);

  constructor(private readonly reportsService: ReportsService) {
    super();
  }

  async process(job: Job<QueueReportProcessingPayload>): Promise<any> {
    const taskId = job.data?.taskId;
    if (taskId) this.logger.log(`Processing job for taskId: ${taskId}`);
    await this.reportsService.processReportTask(taskId);
    this.logger.log(`Processed job ${job.id} of type ${job.name}`);
  }
}
