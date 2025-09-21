// Result type pattern for better error handling
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  success: true;
  data: T;
}

export interface Failure<E> {
  success: false;
  error: E;
}

export const success = <T>(data: T): Success<T> => ({ success: true, data });
export const failure = <E>(error: E): Failure<E> => ({ success: false, error });

// Specific error types for tickets
export interface TicketError {
  type:
    | 'NO_ASSIGNEE_FOUND'
    | 'MULTIPLE_ASSIGNEES_FOUND'
    | 'UNKNOWN_TICKET_TYPE'
    | 'DATABASE_ERROR';
  message: string;
  details?: Record<string, any>;
}

export const createTicketError = (
  type: TicketError['type'],
  message: string,
  details?: Record<string, any>,
): TicketError => ({
  type,
  message,
  details,
});
