import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { makeRandomSeed } from '../../services/comfyui/utils.js';
import prompt from '../json/generate-image-qwen-image-2_1.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { TEXT_TO_IMAGE_FIELDS } from './fields.js';

export interface GenerateImageWithQwenImage21Params {
  cfg: number;
  clip: string;
  height: number;
  model: string;
  negativePrompt: string;
  positivePrompt: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  vae: string;
  width: number;
}

// Everything except the positive prompt defaults to the values saved in the workflow.
const GenerateImageWithQwenImage21ParamsSchema: z.ZodType<GenerateImageWithQwenImage21Params> = z.object({
  cfg: z.number().positive().default(prompt['23'].inputs.value),
  clip: z.string().min(1).default(prompt['13'].inputs.clip_name),
  height: z.number().int().positive().default(prompt['9'].inputs.height),
  model: z.string().min(1).default(prompt['12'].inputs.unet_name),
  negativePrompt: z.string().default(prompt['17'].inputs.value),
  positivePrompt: z.string().min(1),
  sampler: z.string().min(1).default(prompt['19'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['19'].inputs.scheduler),
  seed: z.number().int().default(makeRandomSeed),
  steps: z.number().int().positive().default(prompt['22'].inputs.value),
  vae: z.string().min(1).default(prompt['14'].inputs.vae_name),
  width: z.number().int().positive().default(prompt['9'].inputs.width)
});

export default class GenerateImageWithQwenImage21 extends ComfyUiWorkflow<GenerateImageWithQwenImage21Params> {
  public static readonly fields: WorkflowFields<GenerateImageWithQwenImage21Params> = TEXT_TO_IMAGE_FIELDS;
  public static readonly id: string = 'generate-image-qwen-image-2.1';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.GENERATE_IMAGE;

  public override readonly advancedParams: Array<keyof GenerateImageWithQwenImage21Params> = ['negativePrompt', 'seed', 'steps', 'cfg', 'sampler', 'scheduler'];
  public override readonly outputNodeId = '27';
  public override readonly visibleParams: Array<keyof GenerateImageWithQwenImage21Params> = ['positivePrompt', 'width', 'height'];
  protected override readonly schema: z.ZodType<GenerateImageWithQwenImage21Params> = GenerateImageWithQwenImage21ParamsSchema;

  protected override buildPrompt(params: GenerateImageWithQwenImage21Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '12.inputs.unet_name')
      .setInputNode('clip', '13.inputs.clip_name')
      .setInputNode('vae', '14.inputs.vae_name')
      .setInputNode('width', '9.inputs.width')
      .setInputNode('height', '9.inputs.height')
      .setInputNode('positivePrompt', '16.inputs.value')
      .setInputNode('negativePrompt', '17.inputs.value')
      .setInputNode('seed', '21.inputs.value')
      .setInputNode('steps', '22.inputs.value')
      .setInputNode('cfg', '23.inputs.value')
      .setInputNode('sampler', '19.inputs.sampler_name')
      .setInputNode('scheduler', '19.inputs.scheduler')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('width', params.width)
      .input('height', params.height)
      .input('positivePrompt', params.positivePrompt)
      .input('negativePrompt', params.negativePrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .workflow;
  }
}
