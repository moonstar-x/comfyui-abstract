/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';
import type { WorkflowRequestParams } from '../../workflows/factory.js';
import { WORKFLOW_TYPES } from '../../workflows/types.js';

export interface GenericWSClientMessage<TType extends string, TPayload extends object> { payload?: TPayload; type: TType }
export type GenericWSClientMessageWithPayload<TType extends string, TPayload extends object> = GenericWSClientMessage<TType, TPayload> & { payload: TPayload };

export type RunWorkflowPayload = WorkflowRequestParams & { params: Record<string, unknown> };

// Bounds the runs a client can ask about at once, which is far more than anyone runs in parallel.
const MAX_FOLLOWED_RUNS = 100;

export type WSClientMessage =
  GenericWSClientMessage<'comfyui_free_up_memory', never> |
  GenericWSClientMessage<'get_queue', { promptId: string }> |
  /**
   * The prompt IDs are the runs the client was following, such as before it reconnected. The ones that finished in the meantime
   * are answered with their result.
   */
  GenericWSClientMessage<'get_runs', { promptIds: string[] }> |
  GenericWSClientMessage<'get_status', never> |
  GenericWSClientMessageWithPayload<'cancel_run', { promptId: string }> |
  GenericWSClientMessageWithPayload<'run_workflow', RunWorkflowPayload>;

/**
 * Every client message carries the user's JWT, so each one is authenticated on its own.
 */
export type WSAuthenticatedClientMessage = WSClientMessage & { token: string };

export const ClientMessageSchema: z.ZodType<WSClientMessage> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cancel_run'),
    payload: z.object({ promptId: z.string().min(1) })
  }),
  z.object({ type: z.literal('comfyui_free_up_memory') }),
  z.object({
    type: z.literal('get_queue'),
    payload: z.object({ promptId: z.string().min(1) }).exactOptional()
  }),
  z.object({
    type: z.literal('get_runs'),
    payload: z.object({ promptIds: z.array(z.string().min(1)).max(MAX_FOLLOWED_RUNS) }).exactOptional()
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

export const AuthenticatedClientMessageSchema: z.ZodType<WSAuthenticatedClientMessage> = z.intersection(
  z.object({ token: z.string() }),
  ClientMessageSchema
);
