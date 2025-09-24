export const QUEUE_REPORT_ACCOUNTS = 'task_generate_report_accounts';
export const QUEUE_REPORT_YEARLY = 'task_generate_report_yearly';
export const QUEUE_REPORT_FINANCIAL_STATEMENTS =
  'task_generate_report_financial_statements';

export const MAX_CONCURRENCY = 20;
export const OUTPUT_DIR = 'tmp';
export const OUTPUT_FILES = {
  accounts: 'out/accounts.csv',
  yearly: 'out/yearly.csv',
  fs: 'out/fs.csv',
};
