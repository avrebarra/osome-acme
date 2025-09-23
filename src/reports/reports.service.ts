import { Injectable } from '@nestjs/common';

import {
  listFiles,
  readFiles,
  readFilesAsync,
  writeFile,
} from '../lib/fshelper';
import pLimit from 'p-limit';
import { performance } from 'perf_hooks';

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
  private states = {
    accounts: 'idle',
    yearly: 'idle',
    fs: 'idle',
  };

  state(scope: keyof typeof this.states): string {
    return this.states[scope];
  }

  async generateReportAccounts() {
    // prep data
    this.states.accounts = 'starting';
    const start = performance.now();
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
    this.states.accounts = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  generateReportYearly() {
    // prep data
    this.states.yearly = 'starting';
    const start = performance.now();
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.yearly;
    const files = listFiles(outDir)
      .filter((file) => file.endsWith('.csv') && file !== 'yearly.csv')
      .map((file) => `${outDir}/${file}`);
    const contents = readFiles(files);

    // build data (json array)
    const yearly: Array<{ year: string; cash: number }> = [];
    const cashByYear: Record<string, number> = {};
    for (const page of contents) {
      for (const line of page) {
        const [date, account, , debit, credit] = line.split(',');
        if (account === 'Cash') {
          const year = new Date(date).getFullYear();
          if (!cashByYear[year]) {
            cashByYear[year] = 0;
          }
          cashByYear[year] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
    }
    for (const year of Object.keys(cashByYear).sort()) {
      yearly.push({ year, cash: cashByYear[year] });
    }

    // serialize data
    const output = [
      'Financial Year,Cash Balance',
      ...yearly.map((y) => `${y.year},${y.cash.toFixed(2)}`),
    ];
    writeFile(outputFile, output);
    this.states.yearly = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  generateReportFinancialStatements() {
    // prep data
    this.states.fs = 'starting';
    const start = performance.now();
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.fs;
    const categories = REPORT_CONSTANTS.categories;
    const files = listFiles(outDir)
      .filter((file) => file.endsWith('.csv') && file !== 'fs.csv')
      .map((file) => `${outDir}/${file}`);
    const contents = readFiles(files);

    // build data (json arrays)
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }
    for (const page of contents) {
      for (const line of page) {
        const [, account, , debit, credit] = line.split(',');
        if (Object.prototype.hasOwnProperty.call(balances, account)) {
          balances[account] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
    }
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
      'Assets = Liabilities + Equity',
      `${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    ]);

    // serialize data
    const output = statementRows.map((row) => row.join(','));
    writeFile(outputFile, output);
    this.states.fs = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }
}
