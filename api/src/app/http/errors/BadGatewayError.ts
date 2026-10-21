import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import type { ErrorCode } from './ErrorCodes.js';

export class BadGatewayError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode, options?: ErrorOptions) {
    super(message, {
      ...options,
      description: 'A service the server depends on failed or could not be reached.',
      status: StatusCodes.BAD_GATEWAY,
      code
    });
    this.name = 'BadGatewayError';
  }
}
