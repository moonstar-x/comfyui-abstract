import { BadRequestError } from '../app/http/errors/BadRequestError.js';
import type { ComfyUiWorkflow } from '../services/comfyui/ComfyUiWorkflow.js';
import GenerateImageWithQwenImage21 from './generate-image/GenerateImageWithQwenImage21.js';

export const WORKFLOW_TYPES = {
  GENERATE_IMAGE: 'generate-image'
} as const;
export type WorkflowType = typeof WORKFLOW_TYPES[keyof typeof WORKFLOW_TYPES];

export const WORKFLOW_MODELS = {
  'generate-image': {
    QWEN_IMAGE_2_1: 'qwen-image-2.1',
    KREA2: 'krea2'
  }
} as const;
export type WorkflowModel<TType extends WorkflowType = WorkflowType> = Extract<typeof WORKFLOW_MODELS[TType][keyof typeof WORKFLOW_MODELS[TType]], string>;

export type WorkflowRequestParams = { [TType in WorkflowType]: { model?: WorkflowModel<TType>; type: TType } }[WorkflowType];

const WORKFLOWS: { [TType in WorkflowType]: Partial<Record<WorkflowModel<TType>, () => ComfyUiWorkflow>> } = {
  [WORKFLOW_TYPES.GENERATE_IMAGE]: {
    [WORKFLOW_MODELS[WORKFLOW_TYPES.GENERATE_IMAGE].QWEN_IMAGE_2_1]: () => new GenerateImageWithQwenImage21()
  }
};

export const makeWorkflow = (params: WorkflowRequestParams): ComfyUiWorkflow => {
  const models: Partial<Record<string, () => ComfyUiWorkflow>> = WORKFLOWS[params.type];
  const create = params.model === undefined ? undefined : models[params.model];
  if (create !== undefined) {
    return create();
  }

  throw new BadRequestError(`Could not resolve a workflow with the given params: ${JSON.stringify(params)}`);
};
