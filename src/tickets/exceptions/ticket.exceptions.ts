import { HttpStatus } from '@nestjs/common';
import { ServiceException } from '../../lib/exceptions';

export class NoAssigneeFoundException extends ServiceException {
  constructor(role: string) {
    const data = {
      error: 'NO_ASSIGNEE_FOUND',
      message: `Cannot find user with role ${role} to create a ticket`,
    };
    super(data, HttpStatus.BAD_REQUEST);
  }
}

export class MultipleAssigneesFoundException extends ServiceException {
  constructor(role: string) {
    const data = {
      error: 'MULTIPLE_ASSIGNEES_FOUND',
      message: `Multiple users with role ${role}. Cannot create a ticket`,
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
