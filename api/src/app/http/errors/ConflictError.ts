import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import type { ErrorCode } from './ErrorCodes.js';

export class ConflictError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'The request conflicts with the current state of the resource.',
      status: StatusCodes.CONFLICT,
      code
    });
    this.name = 'ConflictError';
  }
}
