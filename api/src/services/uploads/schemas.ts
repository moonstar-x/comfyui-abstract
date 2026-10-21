import { z } from 'zod';
import type { MediaType } from '../database/models/generations.js';
import { MediaTypeSchema } from '../generations/schemas.js';

export const MAX_UPLOADS_PAGE_SIZE = 100;
const DEFAULT_UPLOADS_PAGE_SIZE = 25;

export interface UploadsQuery {
  limit: number;
  mediaType?: MediaType | undefined;
  offset: number;
}

export const UploadsQuerySchema: z.ZodType<UploadsQuery> = z.object({
  mediaType: MediaTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_UPLOADS_PAGE_SIZE).default(DEFAULT_UPLOADS_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0)
});

export const UploadIdSchema: z.ZodUUID = z.uuid();

export const MAX_BULK_DELETE_UPLOADS = 100;

export interface DeleteUploadsBody {
  ids: string[];
}

export const DeleteUploadsBodySchema: z.ZodType<DeleteUploadsBody> = z.object({
  ids: z.array(UploadIdSchema).min(1).max(MAX_BULK_DELETE_UPLOADS)
});
