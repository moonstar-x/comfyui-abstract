import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import type { ErrorCode } from './ErrorCodes.js';

export class UnauthorizedRequestError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'The server could not authenticate your request.',
      status: StatusCodes.UNAUTHORIZED,
      code
    });
    this.name = 'UnauthorizedRequestError';
  }
}
