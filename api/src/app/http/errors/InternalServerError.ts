import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import type { ErrorCode } from './ErrorCodes.js';

export class InternalServerError extends ApiResponseError {
  constructor(message?: string, code?: ErrorCode) {
    super(message ?? 'An unknown error occurred.', {
      description: 'Something unexpected happened when handling your request.',
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      code
    });
    this.name = 'InternalServerError';
  }
}
