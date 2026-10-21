import { StatusCodes } from 'http-status-codes';
import { ApiResponseError } from './ApiResponseError.js';
import { ErrorCodes } from './ErrorCodes.js';
import type { ErrorCode } from './ErrorCodes.js';

export class UnsupportedMediaTypeError extends ApiResponseError {
  constructor(message: string, code?: ErrorCode) {
    super(message, {
      description: 'The server does not accept the content type of the request.',
      status: StatusCodes.UNSUPPORTED_MEDIA_TYPE,
      code: code ?? ErrorCodes.UNSUPPORTED_MEDIA_TYPE
    });
    this.name = 'UnsupportedMediaTypeError';
  }
}
