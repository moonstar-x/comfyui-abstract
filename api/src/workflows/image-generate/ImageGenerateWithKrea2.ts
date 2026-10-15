/* eslint-disable unicorn/max-nested-calls */
import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import prompt from '../_json/image-generate/image-generate-krea2.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { IMAGE_GENERATE_FIELDS, LORAS_FIELD } from './fields.js';

export interface DiffusionLora { lora: string; strength: number }

export interface ImageGenerateWithKrea2Params {
  cfg: number;
  clip: string;
  denoise: number;
  height: number;
  loras: DiffusionLora[];
  model: string;
  prompt: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  vae: string;
  width: number;
}

// Everything except the prompt defaults to the values saved in the workflow.
const ImageGenerateWithKrea2ParamsSchema: z.ZodType<ImageGenerateWithKrea2Params> = z.object({
  cfg: z.number().positive().default(prompt['7:16'].inputs.cfg),
  clip: z.string().min(1).default(prompt['10'].inputs.clip_name),
  denoise: z.number().min(0).max(1).default(prompt['7:16'].inputs.denoise),
  height: z.number().int().positive().default(prompt['7:13'].inputs.height),
  loras: z.array(z.object({
    lora: z.string().min(1),
    strength: z.number().min(0).max(2).default(1)
  })).default([]),
  model: z.string().min(1).default(prompt['9'].inputs.unet_name),
  prompt: z.string().min(1),
  sampler: z.string().min(1).default(prompt['7:16'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:16'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['7:16'].inputs.steps),
  vae: z.string().min(1).default(prompt['7:12'].inputs.vae_name),
  width: z.number().int().positive().default(prompt['7:13'].inputs.width)
});

export default class ImageGenerateWithKrea2 extends ComfyUiWorkflow<ImageGenerateWithKrea2Params> {
  public static readonly fields: WorkflowFields<ImageGenerateWithKrea2Params> = { ...IMAGE_GENERATE_FIELDS, loras: LORAS_FIELD };
  public static readonly id: string = 'image-generate-krea2';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.IMAGE_GENERATE;

  public override readonly advancedParams: Array<keyof ImageGenerateWithKrea2Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler', 'denoise'];
  public override readonly outputNodeId = '6';
  public override readonly visibleParams: Array<keyof ImageGenerateWithKrea2Params> = ['prompt', 'loras', 'width', 'height'];
  protected override readonly schema: z.ZodType<ImageGenerateWithKrea2Params> = ImageGenerateWithKrea2ParamsSchema;

  protected override buildPrompt(params: ImageGenerateWithKrea2Params): NodeData {
    const builder = new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['images']
    )
      .setInputNode('model', '9.inputs.unet_name')
      .setInputNode('clip', '10.inputs.clip_name')
      .setInputNode('vae', '7:12.inputs.vae_name')
      .setInputNode('prompt', '7:14.inputs.text')
      .setInputNode('width', '7:13.inputs.width')
      .setInputNode('height', '7:13.inputs.height')
      .setInputNode('seed', '7:16.inputs.seed')
      .setInputNode('steps', '7:16.inputs.steps')
      .setInputNode('cfg', '7:16.inputs.cfg')
      .setInputNode('sampler', '7:16.inputs.sampler_name')
      .setInputNode('scheduler', '7:16.inputs.scheduler')
      .setInputNode('denoise', '7:16.inputs.denoise')
      .setOutputNode('images', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('prompt', params.prompt)
      .input('width', params.width)
      .input('height', params.height)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise);

    const { workflow } = builder;
    const loraLoaderInputs: Record<string, unknown> = workflow['11'].inputs;
    for (const key of Object.keys(loraLoaderInputs)) {
      if (key.startsWith('lora_')) {
        Reflect.deleteProperty(loraLoaderInputs, key);
      }
    }
    for (const [index, { lora, strength }] of params.loras.entries()) {
      loraLoaderInputs[`lora_${(index + 1).toString()}`] = { on: true, lora, strength };
    }

    return workflow;
  }
}
