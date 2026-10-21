import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utilities.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../_json/image-upscale/image-upscale-z-image.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { REFINED_IMAGE_UPSCALE_FIELDS } from './fields.js';

export interface ImageUpscaleWithZImageParams {
  cfg: number;
  clip: string;
  denoise: number;
  images: string[];
  model: string;
  prompt: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  upscaleModel: string;
  vae: string;
}

// The image is upscaled with the upscale model and then refined with Z-Image. Everything except the image defaults to the values saved in the workflow.
const ImageUpscaleWithZImageParamsSchema: z.ZodType<ImageUpscaleWithZImageParams> = z.object({
  cfg: z.number().positive().default(prompt['7:20'].inputs.cfg),
  clip: z.string().min(1).default(prompt['7:10'].inputs.clip_name),
  denoise: z.number().min(0).max(1).default(prompt['7:20'].inputs.denoise),
  images: z.array(makeUploadReferenceSchema(UPLOAD_KINDS.IMAGE)).length(1),
  model: z.string().min(1).default(prompt['7:9'].inputs.unet_name),
  prompt: z.string().default(prompt['7:14'].inputs.text),
  sampler: z.string().min(1).default(prompt['7:20'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:20'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['7:20'].inputs.steps),
  upscaleModel: z.string().min(1).default(prompt['7:12'].inputs.model_name),
  vae: z.string().min(1).default(prompt['7:11'].inputs.vae_name)
});

export default class ImageUpscaleWithZImage extends ComfyUiWorkflow<ImageUpscaleWithZImageParams> {
  public static readonly fields: WorkflowFields<ImageUpscaleWithZImageParams> = REFINED_IMAGE_UPSCALE_FIELDS;
  public static readonly id: string = 'image-upscale-z-image';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.IMAGE_UPSCALE;

  public override readonly advancedParams: Array<keyof ImageUpscaleWithZImageParams> = ['prompt', 'seed', 'steps', 'cfg', 'sampler', 'scheduler', 'denoise'];
  public override readonly outputNodeId = '6';
  public override readonly visibleParams: Array<keyof ImageUpscaleWithZImageParams> = ['images'];
  protected override readonly schema: z.ZodType<ImageUpscaleWithZImageParams> = ImageUpscaleWithZImageParamsSchema;

  protected override buildPrompt(params: ImageUpscaleWithZImageParams): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '7:9.inputs.unet_name')
      .setInputNode('clip', '7:10.inputs.clip_name')
      .setInputNode('vae', '7:11.inputs.vae_name')
      .setInputNode('upscaleModel', '7:12.inputs.model_name')
      .setInputNode('images', '5.inputs.image')
      .setInputNode('prompt', '7:14.inputs.text')
      .setInputNode('seed', '7:20.inputs.seed')
      .setInputNode('steps', '7:20.inputs.steps')
      .setInputNode('cfg', '7:20.inputs.cfg')
      .setInputNode('sampler', '7:20.inputs.sampler_name')
      .setInputNode('scheduler', '7:20.inputs.scheduler')
      .setInputNode('denoise', '7:20.inputs.denoise')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('upscaleModel', params.upscaleModel)
      .input('images', params.images[0])
      .input('prompt', params.prompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise)
      .workflow;
  }
}
