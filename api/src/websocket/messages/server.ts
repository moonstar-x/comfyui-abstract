import type { SystemUsage } from '../../services/comfyui/ComfyUiClientSession.js';

export interface GenericWSServerMessage<TType extends string, TData extends object> { payload: TData; type: TType }
export type WSServerMessage =
  GenericWSServerMessage<'error', { message: string }> |
  GenericWSServerMessage<'session', { clientId: string }> |
  GenericWSServerMessage<'status', { online: boolean; usage: SystemUsage }>;
