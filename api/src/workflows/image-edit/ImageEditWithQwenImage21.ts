import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../_json/image-edit/image-edit-qwen-image-2.1.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { WorkflowError } from '../WorkflowError.js';
import { IMAGE_EDIT_FIELDS, makeImagesField } from './fields.js';

const TEXT_ENCODER_NODE_ID = '7:14';
const IMAGE_INPUT_PREFIX = 'images.image_';
const MAX_IMAGES = 10;

// LoadImage node saved in the workflow, cloned once per uploaded image and linked in order to the images.image_N inputs of the text encoder.
const IMAGE_TEMPLATE_NODE_ID = '17';
const IMAGE_NODE_ID_PREFIX = 'image_';

export interface ImageEditWithQwenImage21Params {
  cfg: number;
  clip: string;
  denoise: number;
  images: string[];
  model: string;
  negativePrompt: string;
  prompt: string;
  resolution: number;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  vae: string;
}

// Everything except the positive prompt and the images defaults to the values saved in the workflow.
const ImageEditWithQwenImage21ParamsSchema: z.ZodType<ImageEditWithQwenImage21Params> = z.object({
  cfg: z.number().positive().default(prompt['7:15'].inputs.cfg),
  clip: z.string().min(1).default(prompt['7:10'].inputs.clip_name),
  denoise: z.number().min(0).max(1).default(prompt['7:15'].inputs.denoise),
  images: z.array(makeUploadReferenceSchema(UPLOAD_KINDS.IMAGE)).min(1).max(MAX_IMAGES),
  model: z.string().min(1).default(prompt['7:9'].inputs.unet_name),
  negativePrompt: z.string().default(prompt['7:14'].inputs.negative_prompt),
  prompt: z.string().min(1),
  resolution: z.number().min(0).default(prompt['7:14'].inputs.resolution),
  sampler: z.string().min(1).default(prompt['7:15'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:15'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['7:15'].inputs.steps),
  vae: z.string().min(1).default(prompt['7:11'].inputs.vae_name)
});

export default class ImageEditWithQwenImage21 extends ComfyUiWorkflow<ImageEditWithQwenImage21Params> {
  public static readonly fields: WorkflowFields<ImageEditWithQwenImage21Params> = { ...IMAGE_EDIT_FIELDS, images: makeImagesField(MAX_IMAGES) };
  public static readonly id: string = 'image-edit-qwen-image-2.1';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.IMAGE_EDIT;

  public override readonly advancedParams: Array<keyof ImageEditWithQwenImage21Params> = ['negativePrompt', 'resolution', 'seed', 'steps', 'cfg', 'sampler', 'scheduler', 'denoise'];
  public override readonly outputNodeId = '6';
  public override readonly visibleParams: Array<keyof ImageEditWithQwenImage21Params> = ['prompt', 'images'];
  protected override readonly schema: z.ZodType<ImageEditWithQwenImage21Params> = ImageEditWithQwenImage21ParamsSchema;

  protected override buildPrompt(params: ImageEditWithQwenImage21Params): NodeData {
    if (params.images.length === 0) {
      throw new WorkflowError('At least one image must be provided to edit.');
    }

    const builder = new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '7:9.inputs.unet_name')
      .setInputNode('clip', '7:10.inputs.clip_name')
      .setInputNode('vae', '7:11.inputs.vae_name')
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
      .input('resolution', params.resolution)
      .input('prompt', params.prompt)
      .input('negativePrompt', params.negativePrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise);

    const workflow: NodeData = builder.workflow;
    const imageTemplateNode = builder.workflow[IMAGE_TEMPLATE_NODE_ID];
    const textEncoderInputs: Record<string, unknown> = builder.workflow[TEXT_ENCODER_NODE_ID].inputs;
    for (const key of Object.keys(textEncoderInputs)) {
      if (key.startsWith(IMAGE_INPUT_PREFIX)) {
        Reflect.deleteProperty(textEncoderInputs, key);
      }
    }
    Reflect.deleteProperty(workflow, IMAGE_TEMPLATE_NODE_ID);

    for (const [index, image] of params.images.entries()) {
      const imageNumber = (index + 1).toString();
      const nodeId = `${IMAGE_NODE_ID_PREFIX}${imageNumber}`;
      workflow[nodeId] = { ...imageTemplateNode, inputs: { ...imageTemplateNode.inputs, image } };
      textEncoderInputs[`${IMAGE_INPUT_PREFIX}${imageNumber}`] = [nodeId, 0];
    }

    return workflow;
  }
}
