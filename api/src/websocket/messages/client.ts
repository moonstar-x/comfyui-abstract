/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';
import type { WorkflowRequestParams } from '../../workflows/factory.js';
import { WORKFLOW_TYPES } from '../../workflows/types.js';

export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload?: TPayload; type: TType }
export type GenericWSClientMessageWithPayload<TType extends string, TPayload extends object> = GenericWSClientMessage<TType, TPayload> & { payload: TPayload };

export type RunWorkflowPayload = WorkflowRequestParams & { params: Record<string, unknown> };

export type WSClientMessage =
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  GenericWSClientMessage<'get_status', never> |
  GenericWSClientMessageWithPayload<'run_workflow', RunWorkflowPayload>;

export const ClientMessageSchema: z.ZodType<WSClientMessage> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('get_queue'),
    payload: z.object({ promptId: z.string().min(1) }).exactOptional()
  }),
  z.object({ type: z.literal('get_status') }),
  z.object({
    type: z.literal('run_workflow'),
    payload: z.object({
      type: z.enum(Object.values(WORKFLOW_TYPES)),
      model: z.string().min(1),
      params: z.record(z.string(), z.unknown())
    })
  })
]);
