import { z } from 'zod';
import { WORKFLOW_TYPES } from '../../workflows/types.js';
import type { WorkflowType } from '../../workflows/types.js';
import { MEDIA_TYPES } from '../database/models/generations.js';
import type { MediaType } from '../database/models/generations.js';

export const MAX_GENERATIONS_PAGE_SIZE = 100;
const DEFAULT_GENERATIONS_PAGE_SIZE = 25;

export interface GenerationsQuery {
  limit: number;
  mediaType?: MediaType | undefined;
  /**
   * The alias of the model the generations were made with.
   */
  model?: string | undefined;
  offset: number;
  workflowType?: undefined | WorkflowType;
}

export interface GenerationSummariesQuery {
  mediaType?: MediaType | undefined;
}

export const MediaTypeSchema: z.ZodType<MediaType> = z.enum(MEDIA_TYPES);

const WorkflowTypeSchema: z.ZodType<WorkflowType> = z.enum(Object.values(WORKFLOW_TYPES));

export const GenerationsQuerySchema: z.ZodType<GenerationsQuery> = z.object({
  mediaType: MediaTypeSchema.optional(),
  workflowType: WorkflowTypeSchema.optional(),
  model: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_GENERATIONS_PAGE_SIZE).default(DEFAULT_GENERATIONS_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0)
});

export const GenerationSummariesQuerySchema: z.ZodType<GenerationSummariesQuery> = z.object({
  mediaType: MediaTypeSchema.optional()
});

export const GenerationIdSchema: z.ZodUUID = z.uuid();

export const GenerationOutputIndexSchema: z.ZodType<number> = z.coerce.number().int().min(0);

export const MAX_BULK_DELETE_GENERATIONS = 100;

export interface DeleteGenerationsBody {
  ids: string[];
}

export const DeleteGenerationsBodySchema: z.ZodType<DeleteGenerationsBody> = z.object({
  ids: z.array(GenerationIdSchema).min(1).max(MAX_BULK_DELETE_GENERATIONS)
});
