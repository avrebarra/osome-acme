// queue related constants
export const QUEUE_REPORT_PROCESSING = 'task_generate_report';

export type QueueReportProcessingPayload = {
  taskId: number;
};

// processing related constants
export const MAX_CONCURRENCY = 20;
export const OUTPUT_DIR = 'tmp';
export const OUTPUT_FILES = {
  accounts: 'out/accounts.csv',
  yearly: 'out/yearly.csv',
  fs: 'out/fs.csv',
};
