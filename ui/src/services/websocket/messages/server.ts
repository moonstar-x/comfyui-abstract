import type { Nullable } from '@core/utils/types';

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

export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }

export type WSServerMessage =
  GenericWSServerMessage<'error', { message: string }> |
  GenericWSServerMessage<'queue', { job: Nullable<QueueJobStatus>; pending: number; running: number; size: number }> |
  GenericWSServerMessage<'session', { clientId: string }> |
  GenericWSServerMessage<'status', { online: boolean; usage: SystemUsage }> |
  GenericWSServerMessage<'workflow_start', { promptId: string }>;

export type WSServerMessageType = WSServerMessage['type'];
export type WSServerMessageOfType<TType extends WSServerMessageType> = Extract<WSServerMessage, { type: TType }>;
