import type { Nullable } from '../../../utils/types.js';
import type { WorkflowType } from '../../../workflows/types.js';
import { database } from '../client/postgres.js';
import type {
  GenerationDailyCountRow,
  GenerationModelCountRow,
  GenerationPeriodCountsRow,
  GenerationRow,
  GenerationTimingStatsRow,
  GenerationUserSummaryRow,
  GenerationWorkflowCountRow,
  MediaType
} from '../models/generations.js';

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

export interface GenerationPeriodCounts {
  allTime: number;
  /**
   * The same counts for the previous day, week and month, up to the same point in time as now, so they compare fairly
   * against periods that are still in progress.
   */
  previous: {
    thisMonth: number;
    thisWeek: number;
    today: number;
  };
  thisMonth: number;
  thisWeek: number;
  today: number;
}

export interface GenerationWorkflowCount {
  generationCount: number;
  mediaType: MediaType;
  workflowType: WorkflowType;
}

export interface GenerationModelCount {
  generationCount: number;
  mediaType: MediaType;
  model: string;
}

export interface GenerationDailyCount {
  /**
   * The day formatted as YYYY-MM-DD.
   */
  day: string;
  generationCount: number;
}

/**
 * Milliseconds.
 */
export interface DurationStats {
  avg: number;
  max: number;
  median: number;
  min: number;
  p95: number;
}

export interface GenerationTimingStats {
  /**
   * Time from the moment a generation was queued until ComfyUI started it.
   */
  queueWait: Nullable<DurationStats>;
  /**
   * Time ComfyUI spent running a generation.
   */
  render: Nullable<DurationStats>;
  /**
   * How many generations the stats are made of. Generations without a start time are left out.
   */
  sampleCount: number;
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

export const toGenerationPeriodCounts = (counts: GenerationPeriodCountsRow): GenerationPeriodCounts => ({
  today: counts.today,
  thisWeek: counts.this_week,
  thisMonth: counts.this_month,
  allTime: counts.all_time,
  previous: {
    today: counts.yesterday,
    thisWeek: counts.previous_week,
    thisMonth: counts.previous_month
  }
});

export const toGenerationWorkflowCount = (count: GenerationWorkflowCountRow): GenerationWorkflowCount => ({
  workflowType: count.workflow_type,
  mediaType: count.media_type,
  generationCount: count.generation_count
});

export const toGenerationModelCount = (count: GenerationModelCountRow): GenerationModelCount => ({
  model: count.model,
  mediaType: count.media_type,
  generationCount: count.generation_count
});

export const toGenerationDailyCount = (count: GenerationDailyCountRow): GenerationDailyCount => ({
  day: count.day,
  generationCount: count.generation_count
});

const toDurationStats = (stats: GenerationTimingStatsRow, prefix: 'render' | 'wait'): Nullable<DurationStats> => {
  const min = stats[`${prefix}_min_ms`];
  const max = stats[`${prefix}_max_ms`];
  const avg = stats[`${prefix}_avg_ms`];
  const median = stats[`${prefix}_median_ms`];
  const p95 = stats[`${prefix}_p95_ms`];

  if (min === null || max === null || avg === null || median === null || p95 === null) {
    return null;
  }

  return { min, max, avg, median, p95 };
};

export const toGenerationTimingStats = (stats: GenerationTimingStatsRow): GenerationTimingStats => ({
  sampleCount: stats.sample_count,
  queueWait: toDurationStats(stats, 'wait'),
  render: toDurationStats(stats, 'render')
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
 * Returns the users with the most generations, most generations first. Ties go to the most recently active user.
 * Users without generations are left out.
 */
export const findMostActiveGenerationUserSummaries = async (limit: number): Promise<GenerationUserSummaryRow[]> => {
  const query = `SELECT g.username, u.picture_url, COUNT(*)::int AS generation_count, MAX(g.created_at) AS last_generated_at
    FROM generations g
    JOIN users u ON u.username = g.username
    GROUP BY g.username, u.picture_url
    ORDER BY generation_count DESC, last_generated_at DESC
    LIMIT $1`;

  return await database.manyOrNone<GenerationUserSummaryRow>(query, [limit]);
};

/**
 * Counts every user's generations made since the start of the current day, week (Monday) and month, and of all time.
 * Also counts the previous day, week and month up to the same point in time as now, e.g. last Monday until this time last week.
 * Periods start at midnight UTC.
 */
export const countGenerationsByPeriod = async (): Promise<GenerationPeriodCountsRow> => {
  const query = `SELECT
      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now()))::int AS this_week,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS this_month,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) - interval '1 day' AND created_at < now() - interval '1 day')::int AS yesterday,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now()) - interval '1 week' AND created_at < now() - interval '1 week')::int AS previous_week,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()) - interval '1 month' AND created_at < now() - interval '1 month')::int AS previous_month,
      COUNT(*)::int AS all_time
    FROM generations`;

  return await database.one<GenerationPeriodCountsRow>(query);
};

/**
 * Counts every user's generations per workflow, most used workflow first.
 */
export const countGenerationsByWorkflow = async (): Promise<GenerationWorkflowCountRow[]> => {
  const query = `SELECT workflow_type, media_type, COUNT(*)::int AS generation_count
    FROM generations
    GROUP BY workflow_type, media_type
    ORDER BY generation_count DESC, workflow_type`;

  return await database.manyOrNone<GenerationWorkflowCountRow>(query);
};

/**
 * Returns the models used the most, most generations first.
 */
export const findTopGenerationModels = async (limit: number): Promise<GenerationModelCountRow[]> => {
  const query = `SELECT model, media_type, COUNT(*)::int AS generation_count
    FROM generations
    GROUP BY model, media_type
    ORDER BY generation_count DESC, model
    LIMIT $1`;

  return await database.manyOrNone<GenerationModelCountRow>(query, [limit]);
};

/**
 * Counts every user's generations for each of the last given days, today included and oldest first. Days without generations count as 0.
 * Days start at midnight UTC.
 */
export const countGenerationsByDay = async (days: number): Promise<GenerationDailyCountRow[]> => {
  const query = `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(g.id)::int AS generation_count
    FROM generate_series(date_trunc('day', now()) - ($1 - 1) * interval '1 day', date_trunc('day', now()), interval '1 day') AS d(day)
    LEFT JOIN generations g ON g.created_at >= d.day AND g.created_at < d.day + interval '1 day'
    GROUP BY d.day
    ORDER BY d.day`;

  return await database.manyOrNone<GenerationDailyCountRow>(query, [days]);
};

/**
 * Summarizes how long generations waited in the queue and how long they took to render.
 * Generations without a start time are left out, since their wait and render times cannot be told apart.
 */
export const getGenerationTimingStats = async (): Promise<GenerationTimingStatsRow> => {
  const query = `WITH timings AS (
      SELECT
        EXTRACT(EPOCH FROM started_at - created_at) * 1000 AS wait_ms,
        EXTRACT(EPOCH FROM completed_at - started_at) * 1000 AS render_ms
      FROM generations
      WHERE started_at IS NOT NULL
    )
    SELECT
      COUNT(*)::int AS sample_count,
      MIN(wait_ms)::float8 AS wait_min_ms,
      MAX(wait_ms)::float8 AS wait_max_ms,
      AVG(wait_ms)::float8 AS wait_avg_ms,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY wait_ms)::float8 AS wait_median_ms,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY wait_ms)::float8 AS wait_p95_ms,
      MIN(render_ms)::float8 AS render_min_ms,
      MAX(render_ms)::float8 AS render_max_ms,
      AVG(render_ms)::float8 AS render_avg_ms,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY render_ms)::float8 AS render_median_ms,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY render_ms)::float8 AS render_p95_ms
    FROM timings`;

  return await database.one<GenerationTimingStatsRow>(query);
};

/**
 * Deletes a generation only if it belongs to the given user. Returns the deleted generation so its output files can be cleaned up,
 * or null if it does not exist or belongs to someone else.
 */
export const deleteGeneration = async (id: string, username: string): Promise<Nullable<GenerationRow>> => {
  const query = 'DELETE FROM generations WHERE id = $1 AND username = $2 RETURNING *';
  return await database.oneOrNone<GenerationRow>(query, [id, username]);
};
