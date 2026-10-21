import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import type { ErrorCode } from './ErrorCodes.js';

export class BadRequestError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'The server could not handle your request. Please verify that your request is correct and try again.',
      status: StatusCodes.BAD_REQUEST,
      code
    });
    this.name = 'BadRequestError';
  }
}
