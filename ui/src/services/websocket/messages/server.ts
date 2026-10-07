import type { Nullable } from '@core/utils/types';

export interface SystemUsage {
  cpu: Nullable<number>;
  gpu: Nullable<number>;
  ram: Nullable<number>;
  vram: Nullable<number>;
}

export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }

export type WSServerMessage =
  GenericWSServerMessage<'error', { message: string }> |
  GenericWSServerMessage<'session', { clientId: string }> |
  GenericWSServerMessage<'status', { online: boolean; usage: SystemUsage }>;

export type WSServerMessageType = WSServerMessage['type'];
export type WSServerMessageOfType<TType extends WSServerMessageType> = Extract<WSServerMessage, { type: TType }>;
