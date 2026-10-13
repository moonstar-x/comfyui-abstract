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

export const parseQuery = <T>(schema: z.ZodType<T>, query: unknown): T => {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new SchemaValidationError('Invalid request query.', ErrorCodes.INVALID_QUERY_PROVIDED, result.error.issues);
  }

  return result.data;
};
