import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

interface newTicketDto {
  type: TicketType;
  companyId: number;
}

interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;

    let ticket: TicketDto | null = null;
    switch (type) {
      case TicketType.managementReport:
        ticket = await this.handleManagementReport(companyId);
        break;

      case TicketType.registrationAddressChange:
        ticket = await this.handleRegistrationAddressChange(companyId);
        break;

      default:
        throw new ConflictException(`Unknown ticket type: ${type as string}`);
    }

    return ticket;
  }

  private async handleManagementReport(companyId: number): Promise<TicketDto> {
    const category = TicketCategory.accounting;
    const userRole = UserRole.accountant;

    // find all users with the required role for the company, ordered by creation date
    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    // throw error if no assignees found
    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    // select the first assignee (most recently created)
    const assignee = assignees[0];

    // create the ticket with the selected assignee and other details
    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type: TicketType.managementReport,
      status: TicketStatus.open,
    });

    // build and return the ticket dto
    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }

  private async handleRegistrationAddressChange(
    companyId: number,
  ): Promise<TicketDto> {
    const category = TicketCategory.corporate;
    const userRole = UserRole.corporateSecretary;

    // find all users with the required role for the company, ordered by creation date
    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    // throw error if no assignees found
    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    // throw error if multiple corporate secretaries found
    if (assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    // select the first (and only) assignee
    const assignee = assignees[0];

    // create the ticket with the selected assignee and other details
    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type: TicketType.registrationAddressChange,
      status: TicketStatus.open,
    });

    // build and return the ticket dto
    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }
}
