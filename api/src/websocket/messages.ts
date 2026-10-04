import { z } from 'zod';
import type { ComfyUiConnectionState, ComfyUiMessage } from '../services/comfyui/ComfyUiSession.js';

export type RequestId = number | string;

export type ClientMessage =
  { data: { promptId: string }; id: RequestId; type: 'get_history' } |
  { data: { workflow: Record<string, unknown> }; id: RequestId; type: 'queue_prompt' } |
  { id: RequestId; type: 'get_queue' } |
  { id: RequestId; type: 'interrupt' };

export type ServerMessage =
  { data: ComfyUiMessage; type: 'event' } |
  { data: unknown; id: RequestId; type: 'response' } |
  { data: { clientId: string }; type: 'session' } |
  { data: { message: string }; id?: RequestId; type: 'error' } |
  { data: { state: ComfyUiConnectionState }; type: 'connection' };

const requestIdSchema = z.union([z.string(), z.number()]);
const historyDataSchema = z.object({ promptId: z.string().min(1) });
const queuePromptDataSchema = z.object({ workflow: z.record(z.string(), z.unknown()) });

export const ClientMessageSchema: z.ZodType<ClientMessage> = z.discriminatedUnion('type', [
  z.object({ id: requestIdSchema, type: z.literal('get_history'), data: historyDataSchema }),
  z.object({ id: requestIdSchema, type: z.literal('get_queue') }),
  z.object({ id: requestIdSchema, type: z.literal('interrupt') }),
  z.object({ id: requestIdSchema, type: z.literal('queue_prompt'), data: queuePromptDataSchema })
]);
