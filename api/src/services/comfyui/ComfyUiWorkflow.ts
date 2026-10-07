import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';

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
