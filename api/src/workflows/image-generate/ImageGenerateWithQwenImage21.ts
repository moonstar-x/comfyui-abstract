import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import prompt from '../_json/image-generate/image-generate-qwen-image-2.1.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { IMAGE_GENERATE_FIELDS, NEGATIVE_PROMPT_FIELD, RESOLUTION_FIELD } from './fields.js';

export interface ImageGenerateWithQwenImage21Params {
  cfg: number;
  clip: string;
  denoise: number;
  height: number;
  model: string;
  negativePrompt: string;
  prompt: string;
  resolution: number;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  vae: string;
  width: number;
}

// Everything except the prompt defaults to the values saved in the workflow.
const ImageGenerateWithQwenImage21ParamsSchema: z.ZodType<ImageGenerateWithQwenImage21Params> = z.object({
  cfg: z.number().positive().default(prompt['7:15'].inputs.cfg),
  clip: z.string().min(1).default(prompt['7:10'].inputs.clip_name),
  denoise: z.number().min(0).max(1).default(prompt['7:15'].inputs.denoise),
  height: z.number().int().positive().default(prompt['7:12'].inputs.height),
  model: z.string().min(1).default(prompt['7:9'].inputs.unet_name),
  negativePrompt: z.string().default(prompt['7:14'].inputs.negative_prompt),
  prompt: z.string().min(1),
  resolution: z.number().min(0).default(prompt['7:14'].inputs.resolution),
  sampler: z.string().min(1).default(prompt['7:15'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:15'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['7:15'].inputs.steps),
  vae: z.string().min(1).default(prompt['7:11'].inputs.vae_name),
  width: z.number().int().positive().default(prompt['7:12'].inputs.width)
});

export default class ImageGenerateWithQwenImage21 extends ComfyUiWorkflow<ImageGenerateWithQwenImage21Params> {
  public static readonly fields: WorkflowFields<ImageGenerateWithQwenImage21Params> = {
    ...IMAGE_GENERATE_FIELDS,
    negativePrompt: NEGATIVE_PROMPT_FIELD,
    resolution: RESOLUTION_FIELD
  };

  public static readonly id: string = 'image-generate-qwen-image-2.1';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.IMAGE_GENERATE;

  public override readonly advancedParams: Array<keyof ImageGenerateWithQwenImage21Params> = ['negativePrompt', 'resolution', 'seed', 'steps', 'cfg', 'sampler', 'scheduler', 'denoise'];
  public override readonly outputNodeId = '6';
  public override readonly visibleParams: Array<keyof ImageGenerateWithQwenImage21Params> = ['prompt', 'width', 'height'];
  protected override readonly schema: z.ZodType<ImageGenerateWithQwenImage21Params> = ImageGenerateWithQwenImage21ParamsSchema;

  protected override buildPrompt(params: ImageGenerateWithQwenImage21Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '7:9.inputs.unet_name')
      .setInputNode('clip', '7:10.inputs.clip_name')
      .setInputNode('vae', '7:11.inputs.vae_name')
      .setInputNode('width', '7:12.inputs.width')
      .setInputNode('height', '7:12.inputs.height')
      .setInputNode('resolution', '7:14.inputs.resolution')
      .setInputNode('prompt', '7:14.inputs.prompt')
      .setInputNode('negativePrompt', '7:14.inputs.negative_prompt')
      .setInputNode('seed', '7:15.inputs.seed')
      .setInputNode('steps', '7:15.inputs.steps')
      .setInputNode('cfg', '7:15.inputs.cfg')
      .setInputNode('sampler', '7:15.inputs.sampler_name')
      .setInputNode('scheduler', '7:15.inputs.scheduler')
      .setInputNode('denoise', '7:15.inputs.denoise')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('width', params.width)
      .input('height', params.height)
      .input('resolution', params.resolution)
      .input('prompt', params.prompt)
      .input('negativePrompt', params.negativePrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise)
      .workflow;
  }
}
