/* eslint-disable unicorn/max-nested-calls */
import { z } from 'zod';

export interface WorkflowConfig {
  alias: string;
  params: {
    advanced: string[];
    defaults: Record<string, unknown>;
    visible: string[];
  };
  serverParams: Record<string, unknown>;
  type: string;
  workflow: string;
}

export interface AppConfig {
  workflows: WorkflowConfig[];
}

export const AppConfigSchema: z.ZodType<AppConfig> = z.object({
  workflows: z.array(z.object({
    alias: z.string(),
    params: z.object({
      advanced: z.array(z.string()).default([]),
      visible: z.array(z.string()).default([]),
      defaults: z.record(z.string(), z.unknown())
    }),
    serverParams: z.record(z.string(), z.unknown()),
    type: z.string(),
    workflow: z.string()
  }))
});
