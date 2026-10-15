import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import type { WorkflowField, WorkflowType } from '../../workflows/types.js';

/**
 * Key ComfyUI lists the files of an output node under in the prompt history, such as images for SaveImage and audio for SaveAudio.
 */
export type WorkflowOutputKind = 'audio' | 'images';

export interface WorkflowPrompt<TParams extends object = object> {
  /**
   * Params the prompt was built with, including the defaults the schema filled in such as random seeds.
   */
  params: TParams;
  prompt: NodeData;
}

export abstract class ComfyUiWorkflow<TParams extends object = object> {
  /**
   * Params shown in the advanced section of the client form, in the order they are rendered.
   */
  public abstract readonly advancedParams: Array<keyof TParams>;
  public readonly outputKind: WorkflowOutputKind = 'images';
  /**
   * ID of the node in the workflow whose files are the result of the workflow.
   */
  public abstract readonly outputNodeId: string;
  /**
   * Params shown in the client form, in the order they are rendered.
   */
  public abstract readonly visibleParams: Array<keyof TParams>;
  protected abstract readonly schema: z.ZodType<TParams>;

  /**
   * Defaults the schema fills in for omitted params, keyed by param name. Params without a static default, such as random seeds, are left out.
   */
  public getSchemaDefaults(): Record<string, unknown> {
    if (!(this.schema instanceof z.ZodObject)) {
      return {};
    }

    const defaults: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(this.schema.shape)) {
      if (schema instanceof z.ZodDefault) {
        defaults[key] = schema.def.defaultValue;
      }
    }

    return defaults;
  }

  /**
   * Every param this workflow uses.
   */
  public getWorkflowParams(): Array<keyof TParams> {
    return [...this.visibleParams, ...this.advancedParams];
  }

  /**
   * Build the prompt from on the raw params.
   * @param rawParams
   */
  public makePrompt(rawParams: unknown): WorkflowPrompt<TParams> {
    const result = this.schema.safeParse(rawParams);
    if (!result.success) {
      throw new Error(`Invalid workflow params: ${z.prettifyError(result.error)}`);
    }

    return { params: result.data, prompt: this.buildPrompt(result.data) };
  }

  protected abstract buildPrompt(params: TParams): NodeData;
}

/**
 * Instance side of a workflow implementation whose params are not known, such as one resolved from the config.
 * ComfyUiWorkflow<object> cannot be used for this, since the param lists make the class contravariant in its params.
 */
export interface ComfyUiWorkflowInstance {
  readonly advancedParams: readonly PropertyKey[];
  readonly getSchemaDefaults: () => Record<string, unknown>;
  readonly getWorkflowParams: () => PropertyKey[];
  readonly makePrompt: (rawParams: unknown) => WorkflowPrompt;
  readonly outputKind: WorkflowOutputKind;
  readonly outputNodeId: string;
  readonly visibleParams: readonly PropertyKey[];
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

  new (): ComfyUiWorkflowInstance;
}
