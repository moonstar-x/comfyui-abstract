import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import type { ErrorCode } from './ErrorCodes.js';

export class TooManyRequestsError extends ApiResponseError {
  constructor(message: string, retryAfterSeconds: number, code?: ErrorCode) {
    super(message, {
      description: 'You have made too many requests. Please wait before trying again.',
      status: StatusCodes.TOO_MANY_REQUESTS,
      headers: { 'Retry-After': retryAfterSeconds.toString() },
      code
    });
    this.name = 'TooManyRequestsError';
  }
}
