/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';
import { WORKFLOW_TYPES } from '../../workflows/types.js';
import type { WorkflowType } from '../../workflows/types.js';

export interface WorkflowConfig {
  alias: string;
  options: {
    /**
     * Names of the LoRA models the client may pick from. LoRA params are hidden from the client when empty.
     */
    allowedLoras: string[];
  };
  params: {
    defaults: Record<string, unknown>;
  };
  serverParams: Record<string, unknown>;
  type: WorkflowType;
  workflow: string;
}

export interface LmStudioConfig {
  /**
   * Context length in tokens the model is loaded with in LM Studio. Conversations are trimmed to their latest messages to fit in it.
   */
  contextLength: number;
  /**
   * Identifier of the LM Studio model that answers every conversation, as listed by its /v1/models endpoint.
   */
  model: string;
}

export interface AppConfig {
  lmstudio: LmStudioConfig;
  workflows: WorkflowConfig[];
}

export const AppConfigSchema: z.ZodType<AppConfig> = z.object({
  lmstudio: z.object({
    model: z.string().min(1),
    contextLength: z.number().int().positive()
  }),
  workflows: z.array(z.object({
    alias: z.string(),
    options: z.object({
      allowedLoras: z.array(z.string().min(1)).default([])
    }).default({ allowedLoras: [] }),
    // Params the config omits fall back to the defaults of the workflow schema.
    params: z.object({
      defaults: z.record(z.string(), z.unknown()).default({})
    }).default({ defaults: {} }),
    serverParams: z.record(z.string(), z.unknown()),
    type: z.enum(Object.values(WORKFLOW_TYPES)),
    workflow: z.string()
  }))
});
