import { HttpStatus } from '@nestjs/common';
import { ServiceException } from '../../lib/exceptions';

export class NoAssigneeFoundException extends ServiceException {
  constructor(roleType: string) {
    const data = {
      error: 'NO_ASSIGNEE_FOUND',
      message: `Cannot find user with role ${roleType} to create a ticket`,
    };
    super(data, HttpStatus.BAD_REQUEST);
  }
}

export class TicketAlreadyExistsException extends ServiceException {
  constructor(ticketType: string) {
    const data = {
      error: 'TICKET_ALREADY_EXISTS',
      message: `Ticket of type ${ticketType} already exists`,
    };
    super(data, HttpStatus.CONFLICT);
  }
}

export class RoleConflictException extends ServiceException {
  constructor(roleType: string) {
    const data = {
      error: 'ROLE_CONFLICT',
      message: `Users with conflicting role (${roleType}) found`,
    };
    super(data, HttpStatus.CONFLICT);
  }
}

export class UnknownTicketTypeException extends ServiceException {
  constructor(ticketType: string) {
    const data = {
      error: 'UNKNOWN_TICKET_TYPE',
      message: `Unknown ticket type: ${ticketType}`,
    };
    super(data, HttpStatus.BAD_REQUEST);
  }
}
