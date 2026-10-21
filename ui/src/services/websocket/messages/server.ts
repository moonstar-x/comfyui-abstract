import type { Nullable } from '@core/utils/types';
import type { WorkflowType } from '@services/websocket/messages/client';

export interface SystemUsage {
  cpu: Nullable<number>;
  gpu: Nullable<number>;
  ram: Nullable<number>;
  temperature: Nullable<number>;
  vram: Nullable<number>;
}

export interface QueueJobStatus {
  position: number;
  processing: boolean;
  promptId: string;
}

export interface NodeProgress {
  max: number;
  value: number;
}

/**
 * Progress of a whole run, counted in nodes. The step is the progress of the node currently executing, if it reports any.
 */
export interface WorkflowProgress {
  completed: number;
  step: Nullable<NodeProgress>;
  total: number;
}

/**
 * A run of the user that has not finished yet, whichever tab started it.
 */
export interface ActiveRun {
  // ISO 8601 date.
  createdAt: string;
  // Alias of the workflow model, as defined in the API config.
  model: string;
  /**
   * Null until ComfyUI reports any progress, which never happens for runs queued before the API last restarted.
   */
  progress: Nullable<WorkflowProgress>;
  promptId: string;
  type: WorkflowType;
}

export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }

export type WSServerMessage =
  GenericWSServerMessage<'comfyui_memory_freed', Record<string, never>> |
  GenericWSServerMessage<'error', { code?: string; message: string }> |
  GenericWSServerMessage<'queue', { job: Nullable<QueueJobStatus>; pending: number; running: number; size: number }> |
  GenericWSServerMessage<'runs', { runs: ActiveRun[] }> |
  GenericWSServerMessage<'status', { online: boolean; usage: SystemUsage }> |
  GenericWSServerMessage<'workflow_cancelled', { promptId: string }> |
  GenericWSServerMessage<'workflow_complete', { durationMs: number; files: string[]; generationId: Nullable<string>; promptId: string; queueWaitMs: Nullable<number> }> |
  GenericWSServerMessage<'workflow_error', { message: string; promptId: string }> |
  GenericWSServerMessage<'workflow_progress', WorkflowProgress & { promptId: string }> |
  GenericWSServerMessage<'workflow_queued', { run: ActiveRun }> |
  GenericWSServerMessage<'workflow_start', { promptId: string }>;

export type WSServerMessageType = WSServerMessage['type'];
export type WSServerMessageOfType<TType extends WSServerMessageType> = Extract<WSServerMessage, { type: TType }>;
