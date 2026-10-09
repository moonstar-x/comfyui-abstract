import type { z } from 'zod';
import { ErrorCodes } from './errors/ErrorCodes.js';
import { SchemaValidationError } from './errors/SchemaValidationError.js';

export const parseBody = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new SchemaValidationError('Invalid request body.', ErrorCodes.INVALID_BODY_PROVIDED, result.error.issues);
  }

  return result.data;
};
