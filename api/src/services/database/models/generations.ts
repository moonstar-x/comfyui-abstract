import type { WorkflowType } from '../../../workflows/types.js';

/**
 * Must match the rows of the media_types table.
 */
export const MEDIA_TYPES = {
  IMAGE: 'image',
  AUDIO: 'audio'
} as const;
export type MediaType = typeof MEDIA_TYPES[keyof typeof MEDIA_TYPES];

export interface GenerationRow {
  completed_at: Date;
  created_at: Date;
  id: string;
  media_type: MediaType;
  model: string;
  outputs: string[];
  params: Record<string, unknown>;
  prompt_id: string;
  started_at: Date | null;
  username: string;
  workflow_id: string;
  workflow_type: WorkflowType;
}

export interface GenerationUserSummaryRow {
  generation_count: number;
  last_generated_at: Date;
  picture_url: null | string;
  username: string;
}

export interface GenerationPeriodCountsRow {
  all_time: number;
  previous_month: number;
  previous_week: number;
  this_month: number;
  this_week: number;
  today: number;
  yesterday: number;
}

export interface GenerationWorkflowCountRow {
  generation_count: number;
  media_type: MediaType;
  workflow_type: WorkflowType;
}

export interface GenerationModelCountRow {
  generation_count: number;
  media_type: MediaType;
  model: string;
}

export interface GenerationDailyCountRow {
  /**
   * The day formatted as YYYY-MM-DD.
   */
  day: string;
  generation_count: number;
}

/**
 * Every value is in milliseconds, or null when no generation has a start time.
 */
export interface GenerationTimingStatsRow {
  render_avg_ms: null | number;
  render_max_ms: null | number;
  render_median_ms: null | number;
  render_min_ms: null | number;
  render_p95_ms: null | number;
  sample_count: number;
  wait_avg_ms: null | number;
  wait_max_ms: null | number;
  wait_median_ms: null | number;
  wait_min_ms: null | number;
  wait_p95_ms: null | number;
}
