import { BullModule, RegisterQueueOptions } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WorkerGenerateReportAccounts } from './reports/reports.worker';

const CONFIG_DEFAULTS = {
  host: 'localhost',
  port: '6379',
};

export function registerQueue(...options: RegisterQueueOptions[]) {
  return BullModule.registerQueue(...options);
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || CONFIG_DEFAULTS.host,
        port: parseInt(process.env.REDIS_PORT || CONFIG_DEFAULTS.port, 10),
      },
    }),
    // register queues here
    registerQueue({ name: 'task_generate_report_accounts' }),
    registerQueue({ name: 'task_generate_report_yearly' }),
    registerQueue({ name: 'task_generate_report_financial_statements' }),
  ],
  providers: [WorkerGenerateReportAccounts],
  exports: [BullModule],
})
export class MqModule {}
