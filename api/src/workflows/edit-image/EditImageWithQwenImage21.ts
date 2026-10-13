import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { makeRandomSeed } from '../../services/comfyui/utils.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../json/edit-image-qwen-image-2_1.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { WorkflowError } from '../WorkflowError.js';
import { IMAGE_EDIT_FIELDS, makeImagesField } from './fields.js';

const TEXT_ENCODER_NODE_ID = '9';
const IMAGE_INPUT_PREFIX = 'images.image_';

// LoadImage nodes, linked in order to the images.image_N inputs of the text encoder.
const IMAGE_NODE_IDS = ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'] as const;

export interface EditImageWithQwenImage21Params {
  cfg: number;
  clip: string;
  images: string[];
  model: string;
  negativePrompt: string;
  positivePrompt: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  vae: string;
}

// Everything except the positive prompt and the images defaults to the values saved in the workflow.
const EditImageWithQwenImage21ParamsSchema: z.ZodType<EditImageWithQwenImage21Params> = z.object({
  cfg: z.number().positive().default(prompt['15'].inputs.value),
  clip: z.string().min(1).default(prompt['5'].inputs.clip_name),
  images: z.array(makeUploadReferenceSchema(UPLOAD_KINDS.IMAGE)).max(IMAGE_NODE_IDS.length),
  model: z.string().min(1).default(prompt['4'].inputs.unet_name),
  negativePrompt: z.string().default(prompt['12'].inputs.value),
  positivePrompt: z.string().min(1),
  sampler: z.string().min(1).default(prompt['18'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['18'].inputs.scheduler),
  seed: z.number().int().default(makeRandomSeed),
  steps: z.number().int().positive().default(prompt['14'].inputs.value),
  vae: z.string().min(1).default(prompt['6'].inputs.vae_name)
});

export default class EditImageWithQwenImage21 extends ComfyUiWorkflow<EditImageWithQwenImage21Params> {
  public static readonly fields: WorkflowFields<EditImageWithQwenImage21Params> = { ...IMAGE_EDIT_FIELDS, images: makeImagesField(IMAGE_NODE_IDS.length) };
  public static readonly id: string = 'edit-image-qwen-image-2.1';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.EDIT_IMAGE;

  public override readonly outputNodeId = '20';
  protected override readonly schema: z.ZodType<EditImageWithQwenImage21Params> = EditImageWithQwenImage21ParamsSchema;

  protected override buildPrompt(params: EditImageWithQwenImage21Params): NodeData {
    if (params.images.length === 0) {
      throw new WorkflowError('At least one image must be provided to edit.');
    }

    const builder = new PromptBuilder(
      prompt,
      ['model', 'clip', 'vae', 'positivePrompt', 'negativePrompt', 'seed', 'steps', 'cfg', 'sampler', 'scheduler'],
      ['images']
    )
      .setInputNode('model', '4.inputs.unet_name')
      .setInputNode('clip', '5.inputs.clip_name')
      .setInputNode('vae', '6.inputs.vae_name')
      .setInputNode('positivePrompt', '11.inputs.value')
      .setInputNode('negativePrompt', '12.inputs.value')
      .setInputNode('seed', '13.inputs.value')
      .setInputNode('steps', '14.inputs.value')
      .setInputNode('cfg', '15.inputs.value')
      .setInputNode('sampler', '18.inputs.sampler_name')
      .setInputNode('scheduler', '18.inputs.scheduler')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('positivePrompt', params.positivePrompt)
      .input('negativePrompt', params.negativePrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler);

    const workflow: NodeData = builder.workflow;
    const textEncoderInputs: Record<string, unknown> = builder.workflow[TEXT_ENCODER_NODE_ID].inputs;
    for (const [index, nodeId] of IMAGE_NODE_IDS.entries()) {
      const image = params.images[index];
      const imageNode = workflow[nodeId];
      if (image !== undefined && imageNode !== undefined) {
        imageNode.inputs['image'] = image;
        continue;
      }

      Reflect.deleteProperty(textEncoderInputs, `${IMAGE_INPUT_PREFIX}${(index + 1).toString()}`);
      Reflect.deleteProperty(workflow, nodeId);
    }

    return workflow;
  }
}
