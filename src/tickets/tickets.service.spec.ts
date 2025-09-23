import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService],
      imports: [DbModule],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleManagementReport', () => {
    it('creates managementReport ticket', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.accountant,
        companyId: company.id,
      });

      const ticket = await service.handleTicketManagementReport(company.id);

      expect(ticket.category).toBe(TicketCategory.accounting);
      expect(ticket.assigneeId).toBe(user.id);
      expect(ticket.status).toBe(TicketStatus.open);
      expect(ticket.type).toBe(TicketType.managementReport);
      expect(ticket.companyId).toBe(company.id);
    });

    it('if there are multiple accountants, assign the last one', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.accountant,
        companyId: company.id,
      });
      const user2 = await User.create({
        name: 'Test User 2',
        role: UserRole.accountant,
        companyId: company.id,
      });

      const ticket = await service.handleTicketManagementReport(company.id);

      expect(ticket.category).toBe(TicketCategory.accounting);
      expect(ticket.assigneeId).toBe(user2.id);
      expect(ticket.status).toBe(TicketStatus.open);
      expect(ticket.type).toBe(TicketType.managementReport);
      expect(ticket.companyId).toBe(company.id);
    });

    it('if there is no accountant, throw', async () => {
      const company = await Company.create({ name: 'test' });

      await expect(
        service.handleTicketManagementReport(company.id),
      ).rejects.toEqual(
        new Error(`Cannot find user with role accountant to create a ticket`),
      );
    });
  });

  describe('handleTicketStrikeOff', () => {
    it('creates strikeOff ticket and resolves open tickets', async () => {
      const company = await Company.create({ name: 'test-strikeoff' });
      const director = await User.create({
        name: 'Director',
        role: UserRole.director,
        companyId: company.id,
      });
      // Create an open ticket to be resolved
      const openTicket = await Ticket.create({
        companyId: company.id,
        status: TicketStatus.open,
        type: TicketType.managementReport,
        category: TicketCategory.accounting,
        assigneeId: director.id,
      });
      const ticket = await service.handleTicketStrikeOff(company.id);
      expect(ticket).not.toBeNull();
      expect(ticket?.category).toBe(TicketCategory.management);
      expect(ticket?.assigneeId).toBe(director.id);
      expect(ticket?.status).toBe(TicketStatus.open);
      expect(ticket?.type).toBe(TicketType.strikeOff);
      expect(ticket?.companyId).toBe(company.id);
      // Check that previous open ticket is resolved
      const updated = await Ticket.findByPk(openTicket.id);
      expect(updated?.status).toBe(TicketStatus.resolved);
    });

    it('throws if no director exists', async () => {
      const company = await Company.create({
        name: 'test-strikeoff-nodirector',
      });
      await expect(service.handleTicketStrikeOff(company.id)).rejects.toThrow(
        'Cannot find user with role director to create a ticket',
      );
    });

    it('throws if multiple directors exist', async () => {
      const company = await Company.create({
        name: 'test-strikeoff-multidirector',
      });
      await User.create({
        name: 'Director 1',
        role: UserRole.director,
        companyId: company.id,
      });
      await User.create({
        name: 'Director 2',
        role: UserRole.director,
        companyId: company.id,
      });
      await expect(service.handleTicketStrikeOff(company.id)).rejects.toThrow(
        'Users with conflicting role (director) found',
      );
    });
  });

  describe('handleRegistrationAddressChange', () => {
    it('creates registrationAddressChange ticket', async () => {
      const company = await Company.create({ name: 'test' });
      const user = await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });

      const ticket = await service.handleTicketRegistrationAddressChange(
        company.id,
      );

      expect(ticket.category).toBe(TicketCategory.corporate);
      expect(ticket.assigneeId).toBe(user.id);
      expect(ticket.status).toBe(TicketStatus.open);
      expect(ticket.type).toBe(TicketType.registrationAddressChange);
      expect(ticket.companyId).toBe(company.id);
    });

    it('if there is already a registrationAddressChange ticket, throw', async () => {
      const company = await Company.create({ name: 'test' });

      await Ticket.create({
        type: TicketType.registrationAddressChange,
        companyId: company.id,
      });

      await expect(
        service.handleTicketRegistrationAddressChange(company.id),
      ).rejects.toThrow(
        'Ticket of type registrationAddressChange already exists',
      );
    });

    it('if there are multiple secretaries, throw', async () => {
      const company = await Company.create({ name: 'test' });
      await User.create({
        name: 'Test User',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });
      await User.create({
        name: 'Test User 2',
        role: UserRole.corporateSecretary,
        companyId: company.id,
      });

      await expect(
        service.handleTicketRegistrationAddressChange(company.id),
      ).rejects.toThrow(
        'Users with conflicting role (corporateSecretary) found',
      );
    });

    it('if there is no secretary, throw', async () => {
      const company = await Company.create({ name: 'test' });

      await expect(
        service.handleTicketRegistrationAddressChange(company.id),
      ).rejects.toThrow(
        `Cannot find user with role director to create a ticket`,
      );
    });
  });
});
