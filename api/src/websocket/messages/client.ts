/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';
import { WORKFLOW_MODELS, WORKFLOW_TYPES } from '../../workflows/factory.js';
import type { WorkflowRequestParams } from '../../workflows/factory.js';

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
    payload: z.discriminatedUnion('type', [
      z.object({
        type: z.literal(WORKFLOW_TYPES.GENERATE_IMAGE),
        model: z.literal(Object.values(WORKFLOW_MODELS[WORKFLOW_TYPES.GENERATE_IMAGE])).exactOptional(),
        params: z.record(z.string(), z.unknown())
      })
    ])
  })
]);
