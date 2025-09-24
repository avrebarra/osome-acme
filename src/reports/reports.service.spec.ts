import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { getQueueToken } from '@nestjs/bullmq';

// Mock the fshelper module
jest.mock('../lib/fshelper', () => ({
  listFiles: jest.fn(),
  readFilesAsync: jest.fn(),
  writeFile: jest.fn(),
}));

import { listFiles, readFilesAsync, writeFile } from '../lib/fshelper';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getQueueToken('task_generate_report'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('generateReportAccounts', () => {
    it('should aggregate accounts and write output', async () => {
      // arrange
      (listFiles as jest.Mock).mockReturnValue(['file1.csv', 'file2.csv']);
      (readFilesAsync as jest.Mock).mockImplementation((files: string[]) => {
        if (files[0].includes('file1.csv')) {
          return [
            [
              '2021-01-01,Cash,,100,0',
              '2021-01-01,Sales Revenue,,0,50',
              '2021-01-01,Inventory,,0,20',
            ],
          ];
        }
        if (files[0].includes('file2.csv')) {
          return [
            [
              '2021-01-02,Cash,,200,0',
              '2021-01-02,Sales Revenue,,0,30',
              '2021-01-02,Inventory,,10,0',
            ],
          ];
        }
        return [[]];
      });
      (writeFile as jest.Mock).mockImplementation(() => {});

      // act
      await service.generateReportAccounts();

      // assert
      const expectedOutput = [
        'Account,Balance',
        'Cash,300.00',
        'Sales Revenue,-80.00',
        'Inventory,-10.00',
      ];

      expect(writeFile).toHaveBeenCalledWith(
        'out/accounts.csv',
        expectedOutput,
      );
    });
  });

  describe('generateReportYearly', () => {
    it('should aggregate cash by year and write output', async () => {
      // arrange
      (listFiles as jest.Mock).mockReturnValue([
        '2020.csv',
        '2021.csv',
        '2022.csv',
      ]);
      (readFilesAsync as jest.Mock).mockImplementation((files: string[]) => {
        if (files[0].includes('2020.csv')) {
          return [
            [
              '2020-01-15,Cash,,500,0',
              '2020-06-20,Cash,,0,100',
              '2020-12-31,Inventory,,200,0', // Should be ignored (not Cash)
            ],
          ];
        }
        if (files[0].includes('2021.csv')) {
          return [
            [
              '2021-03-10,Cash,,300,0',
              '2021-09-15,Cash,,0,50',
              '2021-11-20,Sales Revenue,,0,200', // Should be ignored (not Cash)
            ],
          ];
        }
        if (files[0].includes('2022.csv')) {
          return [['2022-01-01,Cash,,100,0', '2022-12-25,Cash,,50,25']];
        }
        return [[]];
      });

      // act
      await service.generateReportYearly();

      // assert
      const expectedOutput = [
        'Financial Year,Cash Balance',
        '2020,400.00',
        '2021,250.00',
        '2022,125.00',
      ];
      expect(writeFile).toHaveBeenCalledWith('out/yearly.csv', expectedOutput);
    });
  });

  describe('generateReportFinancialStatements', () => {
    it('should generate complete financial statement with income statement and balance sheet', async () => {
      // arrange
      (listFiles as jest.Mock).mockReturnValue(['financial.csv']);
      (readFilesAsync as jest.Mock).mockResolvedValue([
        [
          '2021-01-01,Sales Revenue,,0,1000',
          '2021-01-01,Cost of Goods Sold,,500,0',
          '2021-01-01,Salaries Expense,,300,0',
          '2021-01-01,Cash,,2000,0',
          '2021-01-01,Accounts Receivable,,500,0',
          '2021-01-01,Accounts Payable,,0,800',
          '2021-01-01,Common Stock,,0,1200',
        ],
      ]);

      // act
      await service.generateReportFinancialStatements();

      // assert
      const expectedOutput = [
        'Basic Financial Statement',
        '',
        'Income Statement',
        'Sales Revenue,-1000.00',
        'Cost of Goods Sold,500.00',
        'Salaries Expense,300.00',
        'Rent Expense,0.00',
        'Utilities Expense,0.00',
        'Interest Expense,0.00',
        'Tax Expense,0.00',
        'Net Income,-1800.00',
        '',
        'Balance Sheet',
        'Assets',
        'Cash,2000.00',
        'Accounts Receivable,500.00',
        'Inventory,0.00',
        'Fixed Assets,0.00',
        'Prepaid Expenses,0.00',
        'Total Assets,2500.00',
        '',
        'Liabilities',
        'Accounts Payable,-800.00',
        'Loan Payable,0.00',
        'Sales Tax Payable,0.00',
        'Accrued Liabilities,0.00',
        'Unearned Revenue,0.00',
        'Dividends Payable,0.00',
        'Total Liabilities,-800.00',
        '',
        'Equity',
        'Common Stock,-1200.00',
        'Retained Earnings,0.00',
        'Retained Earnings (Net Income),-1800.00',
        'Total Equity,-3000.00',
        '',
        'Assets = Liabilities + Equity 2500.00 = -3800.00',
      ];
      expect(writeFile).toHaveBeenCalledWith('out/fs.csv', expectedOutput);
    });
  });
});
