import { Body, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User } from '../../db/models/User';
import { TicketsService } from './tickets.service';
import { UnknownTicketTypeException } from './exceptions';

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
  constructor(private ticketService: TicketsService) {}

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
        ticket =
          await this.ticketService.handleTicketManagementReport(companyId);
        break;

      case TicketType.registrationAddressChange:
        ticket =
          await this.ticketService.handleTicketRegistrationAddressChange(
            companyId,
          );
        break;

      case TicketType.strikeOff:
        ticket = await this.ticketService.handleTicketStrikeOff(companyId);
        break;

      default:
        throw new UnknownTicketTypeException(type as string);
    }

    return ticket;
  }
}
