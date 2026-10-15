import { API_URL } from '@core/config/environment';
import type { WorkflowType } from '@services/websocket/messages/client';

export type WorkflowOutputKind = 'audio' | 'image';

const WORKFLOW_OUTPUT_KINDS: Record<WorkflowType, WorkflowOutputKind> = {
  'cover-music': 'audio',
  'image-edit': 'image',
  'generate-music': 'audio',
  'image-generate': 'image'
};

// Extensions ComfyUI saves audio with, anything else is treated as an image.
const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set(['flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav']);

export const getWorkflowOutputKind = (type: WorkflowType): WorkflowOutputKind => WORKFLOW_OUTPUT_KINDS[type];

/**
 * The completion message doesn't say which workflow produced the files, so their kind is told apart by extension.
 */
export const getOutputKind = (url: string): WorkflowOutputKind => {
  const { pathname } = new URL(url);
  const extension = pathname.slice(pathname.lastIndexOf('.') + 1).toLowerCase();

  return AUDIO_EXTENSIONS.has(extension) ? 'audio' : 'image';
};

/**
 * The API returns output files as paths relative to itself.
 */
export const toOutputUrl = (path: string): string => new URL(path, API_URL).href;
