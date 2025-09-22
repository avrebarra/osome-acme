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
  MultipleAssigneesFoundException,
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
    const userRole = UserRole.corporateSecretary;

    // find all users with the required role for the company, ordered by creation date
    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });
    if (!assignees.length) {
      throw new NoAssigneeFoundException(userRole);
    }
    if (assignees.length > 1) {
      // throw error if multiple assignees found
      throw new MultipleAssigneesFoundException(userRole);
    }

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
