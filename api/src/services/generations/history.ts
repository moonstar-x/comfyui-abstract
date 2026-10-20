import { logger } from '@moonstar-x/logger';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { omitServerParams } from '../../workflows/factory.js';
import type { GenerationRow } from '../database/models/generations.js';
import { findGenerations, toPublicGeneration } from '../database/repositories/generations.js';
import type { PublicGeneration } from '../database/repositories/generations.js';
import { deleteFileFromPublic } from '../outputs/storage.js';
import type { GenerationsQuery } from './schemas.js';

/**
 * Generations as the history API returns them, which never include the server params of the workflows.
 */
export const toHistoryGeneration = (row: GenerationRow): PublicGeneration => {
  const generation = toPublicGeneration(row);
  return { ...generation, params: omitServerParams({ type: generation.workflowType, model: generation.model }, generation.params) };
};

/**
 * Responds with a page of generations, newest first. One extra row is fetched to tell whether there is a next page.
 */
export const respondWithGenerationsPage = async ({ mediaType, workflowType, model, limit, offset }: GenerationsQuery, username?: string): Promise<ResponseBuilder> => {
  const rows = await findGenerations({ username, mediaType, workflowType, model, limit: limit + 1, offset });
  const hasMore = rows.length > limit;

  return new ResponseBuilder()
    .withData(rows.slice(0, limit).map((row) => toHistoryGeneration(row)))
    .withMeta({ limit, offset, hasMore });
};

/**
 * The generation is already gone from the history, so files that could not be deleted are only logged.
 */
export const deleteGenerationOutputs = async (generation: GenerationRow): Promise<void> => {
  const results = await Promise.allSettled(generation.outputs.map(async (output) => {
    await deleteFileFromPublic(output);
  }));

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error(`Could not delete an output file of generation ${generation.id}.`, result.reason);
    }
  }
};
