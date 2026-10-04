import { z } from 'zod';

export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload?: TPayload; type: TType }

export type WSClientMessage = GenericWSClientMessage<'get_health', never>;

export const ClientMessageSchema: z.ZodType<WSClientMessage> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('get_health') })
]);
