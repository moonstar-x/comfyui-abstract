import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../_json/image-upscale/image-upscale-seedvr2.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { DIFFUSION_IMAGE_UPSCALE_FIELDS } from './fields.js';

const RESIZE_NODE_ID = '7:12';
const MULTIPLIER_INPUT = 'resize_type.multiplier';

export interface ImageUpscaleWithSeedVR2Params {
  denoise: number;
  images: string[];
  model: string;
  multiplier: number;
  sampler: string;
  scheduler: string;
  seed: number;
  vae: string;
}

// The image is sent as a single-item image list, matching the image-list field the client renders. Its alpha channel is loaded as the mask.
const ImageUpscaleWithSeedVR2ParamsSchema: z.ZodType<ImageUpscaleWithSeedVR2Params> = z.object({
  denoise: z.number().min(0).max(1).default(prompt['7:16'].inputs.denoise),
  images: z.array(makeUploadReferenceSchema(UPLOAD_KINDS.IMAGE)).length(1),
  model: z.string().min(1).default(prompt['7:9'].inputs.unet_name),
  multiplier: z.number().min(1).default(prompt[RESIZE_NODE_ID].inputs[MULTIPLIER_INPUT]),
  sampler: z.string().min(1).default(prompt['7:16'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:16'].inputs.scheduler),
  seed: SeedSchema,
  vae: z.string().min(1).default(prompt['7:10'].inputs.vae_name)
});

export default class ImageUpscaleWithSeedVR2 extends ComfyUiWorkflow<ImageUpscaleWithSeedVR2Params> {
  public static readonly fields: WorkflowFields<ImageUpscaleWithSeedVR2Params> = DIFFUSION_IMAGE_UPSCALE_FIELDS;
  public static readonly id: string = 'image-upscale-seedvr2';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.IMAGE_UPSCALE;

  public override readonly advancedParams: Array<keyof ImageUpscaleWithSeedVR2Params> = ['seed', 'sampler', 'scheduler', 'denoise'];
  public override readonly outputNodeId = '6';
  public override readonly visibleParams: Array<keyof ImageUpscaleWithSeedVR2Params> = ['images', 'multiplier'];
  protected override readonly schema: z.ZodType<ImageUpscaleWithSeedVR2Params> = ImageUpscaleWithSeedVR2ParamsSchema;

  protected override buildPrompt(params: ImageUpscaleWithSeedVR2Params): NodeData {
    const builder = new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '7:9.inputs.unet_name')
      .setInputNode('vae', '7:10.inputs.vae_name')
      .setInputNode('images', '5.inputs.image')
      .setInputNode('seed', '7:16.inputs.seed')
      .setInputNode('sampler', '7:16.inputs.sampler_name')
      .setInputNode('scheduler', '7:16.inputs.scheduler')
      .setInputNode('denoise', '7:16.inputs.denoise')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('vae', params.vae)
      .input('images', params.images[0])
      .input('seed', params.seed)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise);

    // The multiplier input name contains a dot, which the builder would treat as a nested path, so it is set directly.
    builder.workflow[RESIZE_NODE_ID].inputs[MULTIPLIER_INPUT] = params.multiplier;

    return builder.workflow;
  }
}
