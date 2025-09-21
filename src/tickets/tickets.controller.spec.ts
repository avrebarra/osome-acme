import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { TicketsController } from './tickets.controller';
import { TicketsService, TicketDto } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;

  const mockTicketsService = {
    handleTicketManagementReport: jest.fn(),
    handleTicketRegistrationAddressChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('returns ok when creating management report ticket', async () => {
        const companyId = 1;
        const expectedTicket: TicketDto = {
          id: 1,
          type: TicketType.managementReport,
          companyId,
          assigneeId: 1,
          status: TicketStatus.open,
          category: TicketCategory.accounting,
        };

        mockTicketsService.handleTicketManagementReport.mockResolvedValue(
          expectedTicket,
        );

        const result = await controller.create({
          companyId,
          type: TicketType.managementReport,
        });

        expect(
          mockTicketsService.handleTicketManagementReport,
        ).toHaveBeenCalledWith(companyId);
        expect(result).toBeDefined();
        expect(result.id).toBe(expectedTicket.id);
        expect(result.type).toBe(TicketType.managementReport);
        expect(result.status).toBe(TicketStatus.open);
      });
    });

    describe('registrationAddressChange', () => {
      it('returns ok when creating registration address change ticket', async () => {
        const companyId = 1;
        const expectedTicket: TicketDto = {
          id: 1,
          type: TicketType.registrationAddressChange,
          companyId,
          assigneeId: 1,
          status: TicketStatus.open,
          category: TicketCategory.corporate,
        };

        mockTicketsService.handleTicketRegistrationAddressChange.mockResolvedValue(
          expectedTicket,
        );

        const result = await controller.create({
          companyId,
          type: TicketType.registrationAddressChange,
        });

        expect(
          mockTicketsService.handleTicketRegistrationAddressChange,
        ).toHaveBeenCalledWith(companyId);
        expect(result).toBeDefined();
        expect(result.id).toBe(expectedTicket.id);
        expect(result.type).toBe(TicketType.registrationAddressChange);
        expect(result.status).toBe(TicketStatus.open);
      });
    });

    describe('unknown ticket type', () => {
      it('returns conflict error for unknown ticket type', async () => {
        const companyId = 1;
        let thrownError: ConflictException | null = null;

        try {
          await controller.create({
            companyId,
            type: 'unknownType' as TicketType,
          });
        } catch (error) {
          thrownError = error as ConflictException;
        }

        expect(thrownError).toBeInstanceOf(ConflictException);
        expect(thrownError?.message).toBe('Unknown ticket type: unknownType');
        expect(
          mockTicketsService.handleTicketManagementReport,
        ).not.toHaveBeenCalled();
        expect(
          mockTicketsService.handleTicketRegistrationAddressChange,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
