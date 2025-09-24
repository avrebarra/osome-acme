import { InjectQueue } from '@nestjs/bullmq';
import { listFiles, readFilesAsync, writeFile } from '../lib/fshelper';
import { Injectable } from '@nestjs/common';
import pLimit from 'p-limit';
import { performance } from 'perf_hooks';
import { Queue } from 'bullmq';
import { Task, TaskState, TaskKind } from '../../db/models/Task';

const REPORT_CONSTANTS = {
  maxConcurrency: 20,
  outputDir: 'tmp',
  outputFiles: {
    accounts: 'out/accounts.csv',
    yearly: 'out/yearly.csv',
    fs: 'out/fs.csv',
  },
  categories: {
    'Income Statement': {
      Revenues: ['Sales Revenue'],
      Expenses: [
        'Cost of Goods Sold',
        'Salaries Expense',
        'Rent Expense',
        'Utilities Expense',
        'Interest Expense',
        'Tax Expense',
      ],
    },
    'Balance Sheet': {
      Assets: [
        'Cash',
        'Accounts Receivable',
        'Inventory',
        'Fixed Assets',
        'Prepaid Expenses',
      ],
      Liabilities: [
        'Accounts Payable',
        'Loan Payable',
        'Sales Tax Payable',
        'Accrued Liabilities',
        'Unearned Revenue',
        'Dividends Payable',
      ],
      Equity: ['Common Stock', 'Retained Earnings'],
    },
  },
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectQueue('task_generate_report_accounts')
    private queueReportAccounts: Queue,
    @InjectQueue('task_generate_report_yearly')
    private queueReportYearly: Queue,
    @InjectQueue('task_generate_report_financial_statements')
    private queueReportFinancialStatements: Queue,
  ) {}

  async enqueueReportTask(taskKind: TaskKind, delay = 0): Promise<number> {
    // create task record
    const task = await Task.create({
      kind: taskKind,
      state: TaskState.Pending,
    });
    const payload = { taskId: task.id };
    const opts = delay > 0 ? { delay } : {};

    // enqueue task
    switch (taskKind) {
      case TaskKind.GenerateReportAccount:
        await this.queueReportAccounts.add(taskKind, payload, opts);
        break;
      case TaskKind.GenerateReportYearly:
        await this.queueReportYearly.add(taskKind, payload, opts);
        break;
      case TaskKind.GenerateReportFinancialStatements:
        await this.queueReportFinancialStatements.add(taskKind, payload, opts);
        break;
      default:
        throw new Error('Unknown task kind: ' + String(taskKind));
    }

    return task.id;
  }

  async processReportTask(taskId: number) {
    // fetch task
    const task = await Task.findByPk(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found`);

    // requeue if not pending
    if (task.state !== TaskState.Pending) {
      await this.enqueueReportTask(task.kind, 1000 * 60); // retry in 1 min
      return;
    }

    // set task to 'in_progress'
    task.state = TaskState.InProgress;
    task.metadata = { startedAt: new Date() };
    await task.save();

    const t0 = performance.now();
    switch (task.kind) {
      case TaskKind.GenerateReportAccount:
        await this.generateReportAccounts();
        break;
      case TaskKind.GenerateReportYearly:
        await this.generateReportYearly();
        break;
      case TaskKind.GenerateReportFinancialStatements:
        await this.generateReportFinancialStatements();
        break;
      default:
        throw new Error('Unknown task kind: ' + String(task.kind));
    }

    task.state = TaskState.Done;
    task.metadata = {
      ...task.metadata,
      finishedAt: new Date(),
      duration: performance.now() - t0,
    };
    await task.save();
  }

  async getReportStates() {
    const kinds = [
      TaskKind.GenerateReportAccount,
      TaskKind.GenerateReportYearly,
      TaskKind.GenerateReportFinancialStatements,
    ];

    // fetch latest task for each kind
    const states: Record<string, string> = {};
    const tasks = await Promise.all(
      kinds.map((kind) =>
        Task.findOne({
          where: { kind },
          order: [['createdAt', 'DESC']],
        }),
      ),
    );

    // determine state for each kind
    for (const kind of kinds) {
      const task = tasks.filter((t) => t != null).find((t) => t.kind === kind);
      if (!task) {
        states[kind] = 'idle';
        continue;
      }
      if (task.state == TaskState.Done) {
        const duration = (task.metadata as { duration?: number })?.duration;
        states[kind] = duration
          ? `finished in ${(duration / 1000).toFixed(2)}`
          : 'finished';
        continue;
      }
      states[kind] = task.state;
    }

    // return states ;
    return {
      'accounts.csv': states[TaskKind.GenerateReportAccount],
      'yearly.csv': states[TaskKind.GenerateReportYearly],
      'fs.csv': states[TaskKind.GenerateReportFinancialStatements],
    };
  }

  async generateReportAccounts() {
    // prep data
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.accounts;
    const files = listFiles(outDir)
      .filter((file) => file.endsWith('.csv'))
      .map((file) => `${outDir}/${file}`);

    // processor functions
    const fnProcessPage = (page: string[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const line of page) {
        const [, account, , debit, credit] = line.split(',');
        if (!map[account]) {
          map[account] = 0;
        }
        map[account] +=
          parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
      }
      return map;
    };
    const fnProcessFile = async (
      filePath: string,
    ): Promise<Record<string, number>> => {
      const pages = await readFilesAsync([filePath]);
      return fnProcessPage(pages[0]); // single file, single page
    };

    // limit concurrency for file reading/processing
    const limit = pLimit(REPORT_CONSTANTS.maxConcurrency);
    const promises = files.map((file) => limit(() => fnProcessFile(file)));
    const pageMaps = await Promise.all(promises);

    // merge all page maps into a single accountMap
    const accountMap: Record<string, number> = {};
    for (const map of pageMaps) {
      for (const [account, balance] of Object.entries(map)) {
        if (!accountMap[account]) {
          accountMap[account] = 0;
        }
        accountMap[account] += balance;
      }
    }

    // build data (json array)
    const accounts: Array<{ account: string; balance: number }> = [];
    for (const [account, balance] of Object.entries(accountMap)) {
      accounts.push({ account, balance });
    }

    // serialize data
    const output = [
      'Account,Balance',
      ...accounts.map((a) => `${a.account},${a.balance.toFixed(2)}`),
    ];
    writeFile(outputFile, output);
  }

  async generateReportYearly() {
    // prep data
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.yearly;
    const files = listFiles(outDir)
      .filter((file) => file.endsWith('.csv') && file !== 'yearly.csv')
      .map((file) => `${outDir}/${file}`);

    // processor functions
    const fnProcessPage = (page: string[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const line of page) {
        const [date, account, , debit, credit] = line.split(',');
        if (account === 'Cash') {
          const year = new Date(date).getFullYear();
          if (!map[year]) {
            map[year] = 0;
          }
          map[year] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
      return map;
    };
    const fnProcessFile = async (
      filePath: string,
    ): Promise<Record<string, number>> => {
      const pages = await readFilesAsync([filePath]);
      return fnProcessPage(pages[0]); // single file, single page
    };

    // limit concurrency for file reading/processing
    const limit = pLimit(REPORT_CONSTANTS.maxConcurrency);
    const promises = files.map((file) => limit(() => fnProcessFile(file)));
    const pageMaps = await Promise.all(promises);

    // merge all page maps into a single cashByYear map
    const cashByYear: Record<string, number> = {};
    for (const map of pageMaps) {
      for (const [year, cash] of Object.entries(map)) {
        if (!cashByYear[year]) {
          cashByYear[year] = 0;
        }
        cashByYear[year] += cash;
      }
    }

    // build data (json array)
    const yearly: Array<{ year: string; cash: number }> = [];
    for (const year of Object.keys(cashByYear).sort()) {
      yearly.push({ year, cash: cashByYear[year] });
    }

    // serialize data
    const output = [
      'Financial Year,Cash Balance',
      ...yearly.map((y) => `${y.year},${y.cash.toFixed(2)}`),
    ];
    writeFile(outputFile, output);
  }

  async generateReportFinancialStatements() {
    // prep data
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.fs;
    const categories = REPORT_CONSTANTS.categories;
    const files = listFiles(outDir)
      .filter((file) => file.endsWith('.csv') && file !== 'fs.csv')
      .map((file) => `${outDir}/${file}`);

    // processor functions
    const fnProcessPage = (
      page: string[],
      balances: Record<string, number>,
    ) => {
      for (const line of page) {
        const [, account, , debit, credit] = line.split(',');
        if (Object.prototype.hasOwnProperty.call(balances, account)) {
          balances[account] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
    };
    const fnProcessFile = async (
      filePath: string,
      balances: Record<string, number>,
    ): Promise<void> => {
      const pages = await readFilesAsync([filePath]);
      fnProcessPage(pages[0], balances); // single file, single page
    };

    // initialize balances
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }

    // limit concurrency for file reading/processing
    const limit = pLimit(REPORT_CONSTANTS.maxConcurrency);
    await Promise.all(
      files.map((file) => limit(() => fnProcessFile(file, balances))),
    );

    // Build financial statement rows as JSON arrays
    const statementRows: Array<string[]> = [];
    statementRows.push(['Basic Financial Statement']);
    statementRows.push([]);
    statementRows.push(['Income Statement']);
    let totalRevenue = 0;
    let totalExpenses = 0;
    for (const account of categories['Income Statement']['Revenues']) {
      const value = balances[account] || 0;
      statementRows.push([account, value.toFixed(2)]);
      totalRevenue += value;
    }
    for (const account of categories['Income Statement']['Expenses']) {
      const value = balances[account] || 0;
      statementRows.push([account, value.toFixed(2)]);
      totalExpenses += value;
    }
    statementRows.push([
      'Net Income',
      (totalRevenue - totalExpenses).toFixed(2),
    ]);
    statementRows.push([]);
    statementRows.push(['Balance Sheet']);
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    statementRows.push(['Assets']);
    for (const account of categories['Balance Sheet']['Assets']) {
      const value = balances[account] || 0;
      statementRows.push([account, value.toFixed(2)]);
      totalAssets += value;
    }
    statementRows.push(['Total Assets', totalAssets.toFixed(2)]);
    statementRows.push([]);
    statementRows.push(['Liabilities']);
    for (const account of categories['Balance Sheet']['Liabilities']) {
      const value = balances[account] || 0;
      statementRows.push([account, value.toFixed(2)]);
      totalLiabilities += value;
    }
    statementRows.push(['Total Liabilities', totalLiabilities.toFixed(2)]);
    statementRows.push([]);
    statementRows.push(['Equity']);
    for (const account of categories['Balance Sheet']['Equity']) {
      const value = balances[account] || 0;
      statementRows.push([account, value.toFixed(2)]);
      totalEquity += value;
    }
    statementRows.push([
      'Retained Earnings (Net Income)',
      (totalRevenue - totalExpenses).toFixed(2),
    ]);
    totalEquity += totalRevenue - totalExpenses;
    statementRows.push(['Total Equity', totalEquity.toFixed(2)]);
    statementRows.push([]);
    statementRows.push([
      `Assets = Liabilities + Equity ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    ]);

    // serialize data
    const output = statementRows.map((row) => row.join(','));
    writeFile(outputFile, output);
  }
}
