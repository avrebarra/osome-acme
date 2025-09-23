const fs = require('fs');
const path = require('path');

const accounts = ['Cash', 'Accounts Receivable', 'Inventory', 'Accounts Payable', 'Sales Revenue', 'Cost of Goods Sold', 'Salaries Expense', 'Rent Expense', 'Utilities Expense', 'Interest Expense', 'Tax Expense', 'Loan Payable', 'Common Stock', 'Retained Earnings', 'Dividends Payable', 'Sales Tax Payable', 'Prepaid Expenses', 'Accrued Liabilities', 'Unearned Revenue', 'Fixed Assets'];
const descriptions = ['Invoice payment', 'Purchase of goods', 'Salary disbursement', 'Rent payment', 'Product sale', 'Inventory adjustment', 'Utility bill', 'Loan repayment', 'Interest income', 'Tax payment'];

function getRandomDate() {
  const start = new Date(2020, 0, 1);
  const end = new Date(2025, 0, 1);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    .toISOString().split('T')[0];
}

function getRandomAmount() {
  return (Math.random() * 120000).toFixed(2);
}

// Ensure tmp directory exists
if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');

const buffers = {};
const BUFFER_LIMIT = 10000;

for (let i = 0; i < 20000000; i++) {
  const date = getRandomDate();
  const account = accounts[Math.floor(Math.random() * accounts.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  const debit = Math.random() > 0.5 ? getRandomAmount() : '';
  const credit = debit === '' ? getRandomAmount() : '';
  const fileName = `tmp/${date.substring(0, 7)}.csv`;
  if (!buffers[fileName]) {
    buffers[fileName] = [];
    console.log(`Creating buffer for ${fileName}`);
  }
  buffers[fileName].push(`${date},${account},${description},${debit},${credit}\n`);
  if (buffers[fileName].length >= BUFFER_LIMIT) {
    fs.appendFileSync(fileName, buffers[fileName].join(''));
    console.log(`Flushed ${BUFFER_LIMIT} lines to ${fileName}`);
    buffers[fileName] = [];
  }
  if (i % 1000000 === 0 && i !== 0) {
    console.log(`Processed ${i} lines...`);
  }
}

// Flush remaining lines
for (const file in buffers) {
  if (buffers[file].length > 0) {
    fs.appendFileSync(file, buffers[file].join(''));
    console.log(`Flushed remaining ${buffers[file].length} lines to ${file}`);
    buffers[file] = [];
  }
}

console.log('Generated accounting line items in accounting_line_items.csv');
