import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../_json/image-upscale/image-upscale-esrgan.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { IMAGE_UPSCALE_FIELDS } from './fields.js';

export interface ImageUpscaleWithESRGANParams {
  images: string[];
  model: string;
}

// The image is sent as a single-item image list, matching the image-list field the client renders.
const ImageUpscaleWithESRGANParamsSchema: z.ZodType<ImageUpscaleWithESRGANParams> = z.object({
  images: z.array(makeUploadReferenceSchema(UPLOAD_KINDS.IMAGE)).length(1),
  model: z.string().min(1).default(prompt['7:2'].inputs.model_name)
});

export default class ImageUpscaleWithESRGAN extends ComfyUiWorkflow<ImageUpscaleWithESRGANParams> {
  public static readonly fields: WorkflowFields<ImageUpscaleWithESRGANParams> = IMAGE_UPSCALE_FIELDS;
  public static readonly id: string = 'image-upscale-esrgan';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.IMAGE_UPSCALE;

  public override readonly advancedParams: Array<keyof ImageUpscaleWithESRGANParams> = [];
  public override readonly outputNodeId = '6';
  public override readonly visibleParams: Array<keyof ImageUpscaleWithESRGANParams> = ['images'];
  protected override readonly schema: z.ZodType<ImageUpscaleWithESRGANParams> = ImageUpscaleWithESRGANParamsSchema;

  protected override buildPrompt(params: ImageUpscaleWithESRGANParams): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '7:2.inputs.model_name')
      .setInputNode('images', '5.inputs.image')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('images', params.images[0])
      .workflow;
  }
}
