import { z } from 'zod';
import { MEDIA_TYPES } from '../database/models/generations.js';
import type { MediaType } from '../database/models/generations.js';

export const MAX_GENERATIONS_PAGE_SIZE = 100;
const DEFAULT_GENERATIONS_PAGE_SIZE = 25;

export interface GenerationsQuery {
  limit: number;
  mediaType?: MediaType | undefined;
  offset: number;
}

export interface GenerationSummariesQuery {
  mediaType?: MediaType | undefined;
}

export const MediaTypeSchema: z.ZodType<MediaType> = z.enum(MEDIA_TYPES);

export const GenerationsQuerySchema: z.ZodType<GenerationsQuery> = z.object({
  mediaType: MediaTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_GENERATIONS_PAGE_SIZE).default(DEFAULT_GENERATIONS_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0)
});

export const GenerationSummariesQuerySchema: z.ZodType<GenerationSummariesQuery> = z.object({
  mediaType: MediaTypeSchema.optional()
});

export const GenerationIdSchema: z.ZodUUID = z.uuid();
