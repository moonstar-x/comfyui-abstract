import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import { ErrorCodes } from './ErrorCodes.js';
import type { ErrorCode } from './ErrorCodes.js';

export class ForbiddenError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'You do not have permission to perform this action.',
      status: StatusCodes.FORBIDDEN,
      code: code ?? ErrorCodes.FORBIDDEN
    });
    this.name = 'ForbiddenError';
  }
}
