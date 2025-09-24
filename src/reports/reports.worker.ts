import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_REPORT_ACCOUNTS } from './reports.constants';

@Processor(QUEUE_REPORT_ACCOUNTS)
export class WorkerGenerateReportAccounts extends WorkerHost {
  private readonly logger = new Logger(WorkerGenerateReportAccounts.name);

  async process(job: Job<any>): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate work
    this.logger.log(`Processed job ${job.id} of type ${job.name}`);
    return { result: 'Report Accounts Generated' };
  }
}
