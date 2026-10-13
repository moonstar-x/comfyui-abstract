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
