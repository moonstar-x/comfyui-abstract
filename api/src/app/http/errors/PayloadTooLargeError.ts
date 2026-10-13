import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import { ErrorCodes } from './ErrorCodes.js';
import type { ErrorCode } from './ErrorCodes.js';

export class PayloadTooLargeError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'The request body is larger than the server accepts.',
      status: StatusCodes.REQUEST_TOO_LONG,
      code: code ?? ErrorCodes.PAYLOAD_TOO_LARGE
    });
    this.name = 'PayloadTooLargeError';
  }
}
