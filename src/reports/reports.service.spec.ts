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
});
