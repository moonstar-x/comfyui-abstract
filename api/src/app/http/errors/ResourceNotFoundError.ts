import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import { ErrorCodes } from './ErrorCodes.js';
import type { ErrorCode } from './ErrorCodes.js';

export class ResourceNotFoundError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'The requested resource was not found by the server.',
      status: StatusCodes.NOT_FOUND,
      code: code ?? ErrorCodes.NOT_FOUND
    });
    this.name = 'ResourceNotFoundError';
  }
}
