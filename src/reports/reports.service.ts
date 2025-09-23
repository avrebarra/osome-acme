import { Injectable } from '@nestjs/common';

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// Shared constants for report generation
const REPORT_CONSTANTS = {
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

  generateReportAccounts() {
    // set the state to starting
    this.states.accounts = 'starting';
    // record the start time
    const start = performance.now();
    // define the temporary directory and output file path
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.accounts;
    // initialize an object to store account balances
    const accountBalances: Record<string, number> = {};
    // iterate over each file in the temporary directory
    fs.readdirSync(outDir).forEach((file) => {
      // process only csv files
      if (file.endsWith('.csv')) {
        // read and split the file into lines
        const lines = fs
          .readFileSync(path.join(outDir, file), 'utf-8')
          .trim()
          .split('\n');
        // iterate over each line in the file
        for (const line of lines) {
          // extract account, debit, and credit values from the line
          const [, account, , debit, credit] = line.split(',');
          // initialize the account balance if not present
          if (!accountBalances[account]) {
            accountBalances[account] = 0;
          }
          // update the account balance
          accountBalances[account] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }
      }
    });
    // prepare the output array with header
    const output = ['Account,Balance'];
    // add each account and its balance to the output
    for (const [account, balance] of Object.entries(accountBalances)) {
      output.push(`${account},${balance.toFixed(2)}`);
    }
    // write the output to the csv file
    fs.writeFileSync(outputFile, output.join('\n'));
    // set the state to finished with elapsed time
    this.states.accounts = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  generateReportYearly() {
    // set the state to starting
    this.states.yearly = 'starting';
    // record the start time
    const start = performance.now();
    // define the temporary directory and output file path
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.yearly;
    // initialize an object to store cash balances by year
    const cashByYear: Record<string, number> = {};
    // iterate over each file in the temporary directory
    fs.readdirSync(outDir).forEach((file) => {
      // process only csv files except yearly.csv
      if (file.endsWith('.csv') && file !== 'yearly.csv') {
        // read and split the file into lines
        const lines = fs
          .readFileSync(path.join(outDir, file), 'utf-8')
          .trim()
          .split('\n');
        // iterate over each line in the file
        for (const line of lines) {
          // extract date, account, debit, and credit values from the line
          const [date, account, , debit, credit] = line.split(',');
          // process only cash account
          if (account === 'Cash') {
            // extract the year from the date
            const year = new Date(date).getFullYear();
            // initialize the cash balance for the year if not present
            if (!cashByYear[year]) {
              cashByYear[year] = 0;
            }
            // update the cash balance for the year
            cashByYear[year] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });
    // prepare the output array with header
    const output = ['Financial Year,Cash Balance'];
    // add each year and its cash balance to the output, sorted by year
    Object.keys(cashByYear)
      .sort()
      .forEach((year) => {
        output.push(`${year},${cashByYear[year].toFixed(2)}`);
      });
    // write the output to the csv file
    fs.writeFileSync(outputFile, output.join('\n'));
    // set the state to finished with elapsed time
    this.states.yearly = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }

  generateReportFinancialStatements() {
    // set the state to starting
    this.states.fs = 'starting';
    // record the start time
    const start = performance.now();
    // define the temporary directory and output file path
    const outDir = REPORT_CONSTANTS.outputDir;
    const outputFile = REPORT_CONSTANTS.outputFiles.fs;
    const categories = REPORT_CONSTANTS.categories;
    // initialize balances for all accounts in categories
    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
      for (const group of Object.values(section)) {
        for (const account of group) {
          balances[account] = 0;
        }
      }
    }
    // iterate over each file in the temporary directory
    fs.readdirSync(outDir).forEach((file) => {
      // process only csv files except fs.csv
      if (file.endsWith('.csv') && file !== 'fs.csv') {
        // read and split the file into lines
        const lines = fs
          .readFileSync(path.join(outDir, file), 'utf-8')
          .trim()
          .split('\n');

        // iterate over each line in the file
        for (const line of lines) {
          // extract account, debit, and credit values from the line
          const [, account, , debit, credit] = line.split(',');

          // update balances if account is in categories
          if (Object.prototype.hasOwnProperty.call(balances, account)) {
            balances[account] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }
      }
    });

    // prepare the output array for the financial statement
    const output: string[] = [];
    output.push('Basic Financial Statement');
    output.push('');
    output.push('Income Statement');
    // calculate and output revenues
    let totalRevenue = 0;
    let totalExpenses = 0;
    for (const account of categories['Income Statement']['Revenues']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalRevenue += value;
    }
    // calculate and output expenses
    for (const account of categories['Income Statement']['Expenses']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalExpenses += value;
    }
    // output net income
    output.push(`Net Income,${(totalRevenue - totalExpenses).toFixed(2)}`);
    output.push('');
    output.push('Balance Sheet');
    // calculate and output assets
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    output.push('Assets');
    for (const account of categories['Balance Sheet']['Assets']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalAssets += value;
    }
    output.push(`Total Assets,${totalAssets.toFixed(2)}`);
    output.push('');
    output.push('Liabilities');
    // calculate and output liabilities
    for (const account of categories['Balance Sheet']['Liabilities']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalLiabilities += value;
    }
    output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
    output.push('');
    output.push('Equity');
    // calculate and output equity
    for (const account of categories['Balance Sheet']['Equity']) {
      const value = balances[account] || 0;
      output.push(`${account},${value.toFixed(2)}`);
      totalEquity += value;
    }
    // add retained earnings from net income to equity
    output.push(
      `Retained Earnings (Net Income),${(totalRevenue - totalExpenses).toFixed(2)}`,
    );
    totalEquity += totalRevenue - totalExpenses;
    output.push(`Total Equity,${totalEquity.toFixed(2)}`);
    output.push('');
    // output the accounting equation
    output.push(
      `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
    );
    // write the output to the csv file
    fs.writeFileSync(outputFile, output.join('\n'));
    // set the state to finished with elapsed time
    this.states.fs = `finished in ${((performance.now() - start) / 1000).toFixed(2)}`;
  }
}
