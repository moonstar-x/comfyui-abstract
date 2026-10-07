import { BadRequestError } from '../app/http/errors/BadRequestError.js';
import type { ComfyUiWorkflow } from '../services/comfyui/ComfyUiWorkflow.js';
import GenerateImageWithQwenImage21 from './generate-image/GenerateImageWithQwenImage21.js';

export const WORKFLOW_TYPES = {
  GENERATE_IMAGE: 'generate-image'
} as const;
export type WorkflowType = typeof WORKFLOW_TYPES[keyof typeof WORKFLOW_TYPES];

export const WORKFLOW_MODELS = {
  QWEN_IMAGE_2_1: 'qwen-image-2.1'
} as const;
export type WorkflowModel = typeof WORKFLOW_MODELS[keyof typeof WORKFLOW_MODELS];

export interface WorkflowRequestParams {
  model?: WorkflowModel;
  type: WorkflowType;
}

const WORKFLOWS: Record<WorkflowType, Partial<Record<WorkflowModel, () => ComfyUiWorkflow>>> = {
  [WORKFLOW_TYPES.GENERATE_IMAGE]: {
    [WORKFLOW_MODELS.QWEN_IMAGE_2_1]: () => new GenerateImageWithQwenImage21()
  }
};

export const makeWorkflow = (params: WorkflowRequestParams): ComfyUiWorkflow => {
  const create = params.model === undefined ? undefined : WORKFLOWS[params.type][params.model];
  if (create !== undefined) {
    return create();
  }

  throw new BadRequestError(`Could not resolve a workflow with the given params: ${JSON.stringify(params)}`);
};
