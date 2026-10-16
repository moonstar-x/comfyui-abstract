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

export interface AppConfig {
  workflows: WorkflowConfig[];
}

export const AppConfigSchema: z.ZodType<AppConfig> = z.object({
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
