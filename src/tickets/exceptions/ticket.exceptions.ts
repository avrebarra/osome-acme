import { HttpException, HttpStatus } from '@nestjs/common';

export class NoAssigneeFoundException extends HttpException {
  constructor(role: string, companyId: number) {
    super(
      {
        error: 'NO_ASSIGNEE_FOUND',
        message: `Cannot find user with role ${role} to create a ticket`,
        details: {
          role,
          companyId,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class MultipleAssigneesFoundException extends HttpException {
  constructor(role: string, count: number) {
    super(
      {
        error: 'MULTIPLE_ASSIGNEES_FOUND',
        message: `Multiple users with role ${role}. Cannot create a ticket`,
        details: {
          role,
          count,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class UnknownTicketTypeException extends HttpException {
  constructor(ticketType: string) {
    super(
      {
        error: 'UNKNOWN_TICKET_TYPE',
        message: `Unknown ticket type: ${ticketType}`,
        details: {
          ticketType,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Custom error response type for type safety
export interface CustomErrorResponse {
  error: string;
  message: string;
  details: Record<string, any>;
}
