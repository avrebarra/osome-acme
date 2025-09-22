import { Injectable } from '@nestjs/common';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import {
  NoAssigneeFoundException,
  RoleConflictException,
  TicketAlreadyExistsException,
} from './exceptions/ticket.exceptions';

export interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

@Injectable()
export class TicketsService {
  async handleTicketManagementReport(companyId: number): Promise<TicketDto> {
    const category = TicketCategory.accounting;
    const userRole = UserRole.accountant;

    // find all users with the required role for the company, ordered by creation date
    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    // throw error if no assignees found
    if (!assignees.length) throw new NoAssigneeFoundException(userRole);

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

  async handleTicketRegistrationAddressChange(
    companyId: number,
  ): Promise<TicketDto> {
    const category = TicketCategory.corporate;

    // fetch all required data
    const [existingTickets, directors, secretaries] = await Promise.all([
      Ticket.findAll({
        where: { companyId, type: TicketType.registrationAddressChange },
      }),
      User.findAll({
        where: { companyId, role: UserRole.director },
        order: [['createdAt', 'DESC']],
        limit: 2, // limit to 2 assignees
      }),
      User.findAll({
        where: { companyId, role: UserRole.corporateSecretary },
        order: [['createdAt', 'DESC']],
        limit: 2, // limit to 2 assignees
      }),
    ]);

    // validate no duplicate tickets
    if (existingTickets.length) {
      throw new TicketAlreadyExistsException(
        TicketType.registrationAddressChange,
      );
    }

    // validate assignees
    let assignees = secretaries;
    let assigneeType = UserRole.corporateSecretary;
    if (!assignees.length) {
      // if no secretaries found, use directors
      assignees = directors;
      assigneeType = UserRole.director;
    }
    if (!assignees.length) {
      throw new NoAssigneeFoundException(assigneeType);
    }
    if (assignees.length > 1) {
      // if more than one assignee found then there is a role conflict
      throw new RoleConflictException(assigneeType);
    }

    // select the first (and only) assignee
    const assignee = secretaries[0];
    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type: TicketType.registrationAddressChange,
      status: TicketStatus.open,
    });

    // build and return the ticket
    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }

  async handleTicketStrikeOff(companyId: number): Promise<TicketDto> {
    // fetch all required data
    const [directors] = await Promise.all([
      User.findAll({
        where: { companyId, role: UserRole.director },
        order: [['createdAt', 'DESC']],
        limit: 2, // limit to 2 users
      }),
    ]);
    if (!directors.length) {
      throw new NoAssigneeFoundException(UserRole.director);
    }
    if (directors.length > 1) {
      // if more than one assignee found then there is a role conflict
      throw new RoleConflictException(UserRole.director);
    }

    // select assignee
    const assignee = directors[0];
    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category: TicketCategory.management,
      type: TicketType.strikeOff,
      status: TicketStatus.open,
    });

    // perform side effects: set all open tickets as resolved
    await Ticket.update(
      { status: TicketStatus.resolved },
      { where: { companyId, status: TicketStatus.open } },
    );

    // build and return the ticket
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
