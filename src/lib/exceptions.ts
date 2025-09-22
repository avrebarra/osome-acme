import { HttpException, HttpStatus } from '@nestjs/common';

export class ServiceException extends HttpException {
  constructor(
    detail: ServiceExceptionDetail,
    status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    detail.error = detail.error || 'SERVICE_ERROR';
    detail.details = detail.details || {};
    super(detail, status);
  }
}

export interface ServiceExceptionDetail {
  message: string;
  error?: string;
  details?: Record<string, any>;
}
