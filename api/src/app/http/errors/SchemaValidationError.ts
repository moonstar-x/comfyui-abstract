import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { ApiResponseError } from './ApiResponseError.js';
import { ErrorCodes } from './ErrorCodes.js';
import type { ErrorCode } from './ErrorCodes.js';

export class SchemaValidationError extends ApiResponseError {
  private readonly issues: z.core.$ZodIssue[];

  constructor(message: string, code: ErrorCode = ErrorCodes.INVALID_BODY_PROVIDED, issues?: z.core.$ZodIssue[]) {
    super(message, {
      description: 'The body of this request does not conform to the validation schema.',
      status: StatusCodes.BAD_REQUEST,
      code
    });
    this.name = 'SchemaValidationError';

    this.issues = issues ?? [];
  }

  public override getResponsePayload(): object {
    return {
      ...super.getResponsePayload(),
      issues: this.issues,
      prettyIssues: z.prettifyError({ issues: this.issues })
    };
  }
}
