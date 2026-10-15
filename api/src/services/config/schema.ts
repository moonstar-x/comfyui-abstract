/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';
import { WORKFLOW_TYPES } from '../../workflows/types.js';
import type { WorkflowType } from '../../workflows/types.js';

export interface WorkflowConfig {
  alias: string;
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
    // Params the config omits fall back to the defaults of the workflow schema.
    params: z.object({
      defaults: z.record(z.string(), z.unknown()).default({})
    }).default({ defaults: {} }),
    serverParams: z.record(z.string(), z.unknown()),
    type: z.enum(Object.values(WORKFLOW_TYPES)),
    workflow: z.string()
  }))
});
