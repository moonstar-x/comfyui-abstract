/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';

export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload?: TPayload; type: TType }

export type WSClientMessage =
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  GenericWSClientMessage<'get_status', never>;

export const ClientMessageSchema: z.ZodType<WSClientMessage> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('get_queue'),
    payload: z.object({ promptId: z.string().min(1) }).exactOptional()
  }),
  z.object({ type: z.literal('get_status') })
]);
