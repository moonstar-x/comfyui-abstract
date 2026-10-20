import type { ErrorCode } from '../../app/http/errors/ErrorCodes.js';
import type { PromptProgress, SystemUsage } from '../../services/comfyui/ComfyUiClientSession.js';
import type { Nullable } from '../../utils/types.js';

/**
 * Position of a job in the queue (1-based), including the running jobs.
 */
export interface QueueJobStatus {
  position: number;
  processing: boolean;
  promptId: string;
}

export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }
export type WSServerMessage =
  GenericWSServerMessage<'comfyui_memory_freed', Record<string, never>> |
  GenericWSServerMessage<'error', { code?: ErrorCode; message: string }> |
  GenericWSServerMessage<'queue', { job: Nullable<QueueJobStatus>; pending: number; running: number; size: number }> |
  GenericWSServerMessage<'session', { clientId: string }> |
  GenericWSServerMessage<'status', { online: boolean; usage: SystemUsage }> |
  GenericWSServerMessage<'workflow_complete', { durationMs: number; files: string[]; generationId: Nullable<string>; promptId: string; queueWaitMs: Nullable<number> }> |
  GenericWSServerMessage<'workflow_error', { message: string; promptId: string }> |
  GenericWSServerMessage<'workflow_progress', PromptProgress & { promptId: string }> |
  GenericWSServerMessage<'workflow_start', { promptId: string }>;
