import { ErrorCodes } from './ErrorCodes.js';
import type { ErrorCode } from './ErrorCodes.js';

export interface ApiResponseErrorOptions extends ErrorOptions {
  code?: ErrorCode | undefined;
  description: string;
  /**
   * Extra headers sent with the error response.
   */
  headers?: Record<string, string> | undefined;
  status: number;
}

export class ApiResponseError extends Error {
  public readonly code: ErrorCode;
  public readonly description: string;
  public readonly headers: Record<string, string>;
  public readonly status: number;

  constructor(message: string, options: ApiResponseErrorOptions) {
    super(message, options);
    this.name = 'ApiResponseError';
    this.status = options.status;
    this.description = options.description;
    this.headers = options.headers ?? {};
    this.code = options.code ?? ErrorCodes.UNKNOWN_ERROR;
  }

  public getResponsePayload(): object {
    return {
      code: this.code,
      message: this.message,
      description: this.description
    };
  }
}
