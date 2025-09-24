import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';

// Mock the fshelper module
jest.mock('../lib/fshelper', () => ({
  listFiles: jest.fn(),
  readFilesAsync: jest.fn(),
  writeFile: jest.fn(),
}));

import { listFiles, readFilesAsync, writeFile } from '../lib/fshelper';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
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

      expect(service.state('accounts')).toMatch(/finished in \d+\.\d+/);
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
      expect(service.state('yearly')).toMatch(/finished in/);
      expect(writeFile).toHaveBeenCalledWith('out/yearly.csv', expectedOutput);
    });
  });
});
