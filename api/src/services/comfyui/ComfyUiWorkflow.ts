import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import type { WorkflowField, WorkflowType } from '../../workflows/types.js';

export abstract class ComfyUiWorkflow<TParams extends object = object> {
  /**
   * ID of the node in the workflow whose images are the result of the workflow.
   */
  public abstract readonly outputNodeId: string;
  protected abstract readonly schema: z.ZodType<TParams>;

  public makePrompt(rawParams: unknown): NodeData {
    const result = this.schema.safeParse(rawParams);
    if (!result.success) {
      throw new Error(`Invalid workflow params: ${z.prettifyError(result.error)}`);
    }

    return this.buildPrompt(result.data);
  }

  protected abstract buildPrompt(params: TParams): NodeData;
}

/**
 * Static side of a workflow implementation, used to resolve the implementation referenced by the config.
 */
export interface ComfyUiWorkflowClass {
  /**
   * Describes every param the workflow accepts, so the client can render the ones exposed by the config.
   */
  readonly fields: Readonly<Record<string, WorkflowField>>;
  /**
   * Identifier referenced by the workflow field of the config.
   */
  readonly id: string;
  readonly type: WorkflowType;

  new (): ComfyUiWorkflow;
}
