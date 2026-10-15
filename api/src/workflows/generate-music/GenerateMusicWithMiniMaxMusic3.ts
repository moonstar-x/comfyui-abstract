import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import type { WorkflowOutputKind } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import prompt from '../json/generate-music-minimax-music3.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { makeTextToMusicFields } from './fields.js';

const MINIMAX_MUSIC3_MAX_DURATION = 300;

export interface GenerateMusicWithMiniMaxMusic3Params {
  captionPrompt: string;
  cfg: number;
  clip: string;
  lyricsPrompt: string;
  maxDuration: number;
  model: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  tiledDecode: boolean;
  vae: string;
}

// Everything except the captions and lyrics prompt defaults to the values saved in the workflow.
const GenerateMusicWithMiniMaxMusic3ParamsSchema: z.ZodType<GenerateMusicWithMiniMaxMusic3Params> = z.object({
  model: z.string().min(1).default(prompt['12'].inputs.unet_name),
  clip: z.string().min(1).default(prompt['13'].inputs.clip_name),
  vae: z.string().min(1).default(prompt['14'].inputs.vae_name),
  captionPrompt: z.string().min(1),
  lyricsPrompt: z.string().min(1),
  cfg: z.number().positive().default(prompt['23'].inputs.value),
  sampler: z.string().min(1).default(prompt['39'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['39'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['22'].inputs.value),
  maxDuration: z.number().positive().max(MINIMAX_MUSIC3_MAX_DURATION).default(prompt['36'].inputs.value),
  tiledDecode: z.boolean().default(prompt['33'].inputs.value)
});

export default class GenerateMusicWithMiniMaxMusic3 extends ComfyUiWorkflow<GenerateMusicWithMiniMaxMusic3Params> {
  public static readonly fields: WorkflowFields<GenerateMusicWithMiniMaxMusic3Params> = makeTextToMusicFields(MINIMAX_MUSIC3_MAX_DURATION);
  public static readonly id: string = 'generate-music-minimax-music3';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.GENERATE_MUSIC;

  public override readonly advancedParams: Array<keyof GenerateMusicWithMiniMaxMusic3Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler', 'tiledDecode'];
  public override readonly outputKind: WorkflowOutputKind = 'audio';
  public override readonly outputNodeId = '43';
  public override readonly visibleParams: Array<keyof GenerateMusicWithMiniMaxMusic3Params> = ['captionPrompt', 'lyricsPrompt', 'maxDuration'];
  protected override readonly schema: z.ZodType<GenerateMusicWithMiniMaxMusic3Params> = GenerateMusicWithMiniMaxMusic3ParamsSchema;

  protected override buildPrompt(params: GenerateMusicWithMiniMaxMusic3Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['audio']
    )
      .setInputNode('model', '12.inputs.unet_name')
      .setInputNode('clip', '13.inputs.clip_name')
      .setInputNode('vae', '14.inputs.vae_name')
      .setInputNode('captionPrompt', '16.inputs.value')
      .setInputNode('lyricsPrompt', '17.inputs.value')
      .setInputNode('seed', '21.inputs.value')
      .setInputNode('steps', '22.inputs.value')
      .setInputNode('cfg', '23.inputs.value')
      .setInputNode('sampler', '39.inputs.sampler_name')
      .setInputNode('scheduler', '39.inputs.scheduler')
      .setInputNode('maxDuration', '36.inputs.value')
      .setInputNode('tiledDecode', '33.inputs.value')
      .setOutputNode('audio', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('captionPrompt', params.captionPrompt)
      .input('lyricsPrompt', params.lyricsPrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('maxDuration', params.maxDuration)
      .input('tiledDecode', params.tiledDecode)
      .workflow;
  }
}
