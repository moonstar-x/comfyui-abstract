import type { Nullable } from '../../../utils/types.js';
import type { WorkflowType } from '../../../workflows/types.js';
import { database } from '../client/postgres.js';
import type { GenerationRow, GenerationUserSummaryRow, MediaType } from '../models/generations.js';

export interface PublicGeneration {
  completedAt: Date;
  createdAt: Date;
  /**
   * Milliseconds from the moment the generation was queued until it completed.
   */
  durationMs: number;
  id: string;
  mediaType: MediaType;
  model: string;
  outputs: string[];
  params: Record<string, unknown>;
  promptId: string;
  startedAt: Nullable<Date>;
  username: string;
  workflowId: string;
  workflowType: WorkflowType;
}

export interface GenerationUserSummary {
  generationCount: number;
  lastGeneratedAt: Date;
  pictureUrl: Nullable<string>;
  username: string;
}

export interface CreateGenerationData {
  completedAt: Date;
  createdAt: Date;
  mediaType: MediaType;
  model: string;
  outputs: string[];
  params: Record<string, unknown>;
  promptId: string;
  startedAt: Nullable<Date>;
  username: string;
  workflowId: string;
  workflowType: WorkflowType;
}

export interface FindGenerationsFilter {
  limit: number;
  mediaType?: MediaType | undefined;
  offset: number;
  /**
   * Only returns the generations of this user when given, otherwise the generations of every user.
   */
  username?: string | undefined;
}

export const toPublicGeneration = (generation: GenerationRow): PublicGeneration => ({
  id: generation.id,
  username: generation.username,
  promptId: generation.prompt_id,
  mediaType: generation.media_type,
  workflowType: generation.workflow_type,
  workflowId: generation.workflow_id,
  model: generation.model,
  params: generation.params,
  outputs: generation.outputs,
  createdAt: generation.created_at,
  startedAt: generation.started_at,
  completedAt: generation.completed_at,
  durationMs: generation.completed_at.getTime() - generation.created_at.getTime()
});

export const toGenerationUserSummary = (summary: GenerationUserSummaryRow): GenerationUserSummary => ({
  username: summary.username,
  pictureUrl: summary.picture_url,
  generationCount: summary.generation_count,
  lastGeneratedAt: summary.last_generated_at
});

export const createGeneration = async (data: CreateGenerationData): Promise<GenerationRow> => {
  const query = `INSERT INTO generations(username, prompt_id, media_type, workflow_type, workflow_id, model, params, outputs, created_at, started_at, completed_at)
    VALUES($1, $2, $3, $4, $5, $6, $7:json, $8::text[], $9, $10, $11)
    RETURNING *`;

  return await database.one<GenerationRow>(query, [
    data.username,
    data.promptId,
    data.mediaType,
    data.workflowType,
    data.workflowId,
    data.model,
    data.params,
    data.outputs,
    data.createdAt,
    data.startedAt,
    data.completedAt
  ]);
};

export const findGenerationById = async (id: string): Promise<Nullable<GenerationRow>> => {
  const query = 'SELECT * FROM generations WHERE id = $1';
  return await database.oneOrNone<GenerationRow>(query, [id]);
};

/**
 * Returns the generations matching the filter, newest first.
 */
export const findGenerations = async ({ username, mediaType, limit, offset }: FindGenerationsFilter): Promise<GenerationRow[]> => {
  const query = `SELECT * FROM generations
    WHERE ($1::varchar IS NULL OR username = $1) AND ($2::varchar IS NULL OR media_type = $2)
    ORDER BY created_at DESC, id DESC
    LIMIT $3 OFFSET $4`;

  return await database.manyOrNone<GenerationRow>(query, [username ?? null, mediaType ?? null, limit, offset]);
};

export const countGenerationsByUsername = async (username: string): Promise<number> => {
  const query = 'SELECT COUNT(*)::int AS count FROM generations WHERE username = $1';
  const { count } = await database.one<{ count: number }>(query, [username]);
  return count;
};

/**
 * Returns how many generations each user has made, optionally of a single media type, most recently active user first.
 * Users without generations are left out.
 */
export const findGenerationUserSummaries = async (mediaType?: MediaType): Promise<GenerationUserSummaryRow[]> => {
  const query = `SELECT g.username, u.picture_url, COUNT(*)::int AS generation_count, MAX(g.created_at) AS last_generated_at
    FROM generations g
    JOIN users u ON u.username = g.username
    WHERE $1::varchar IS NULL OR g.media_type = $1
    GROUP BY g.username, u.picture_url
    ORDER BY last_generated_at DESC`;

  return await database.manyOrNone<GenerationUserSummaryRow>(query, [mediaType ?? null]);
};

/**
 * Deletes a generation only if it belongs to the given user. Returns the deleted generation so its output files can be cleaned up,
 * or null if it does not exist or belongs to someone else.
 */
export const deleteGeneration = async (id: string, username: string): Promise<Nullable<GenerationRow>> => {
  const query = 'DELETE FROM generations WHERE id = $1 AND username = $2 RETURNING *';
  return await database.oneOrNone<GenerationRow>(query, [id, username]);
};
