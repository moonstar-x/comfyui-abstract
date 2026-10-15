import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import type { WorkflowOutputKind } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import prompt from '../json/music-generate/music-generate-minimax-music3.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { makeTextToMusicFields } from './fields.js';

const MINIMAX_MUSIC3_MAX_DURATION = 300;

export interface MusicGenerateWithMiniMaxMusic3Params {
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
const MusicGenerateWithMiniMaxMusic3ParamsSchema: z.ZodType<MusicGenerateWithMiniMaxMusic3Params> = z.object({
  captionPrompt: z.string().min(1),
  cfg: z.number().positive().default(prompt['7:15'].inputs.cfg),
  clip: z.string().min(1).default(prompt['7:10'].inputs.clip_name),
  lyricsPrompt: z.string().min(1),
  maxDuration: z.number().positive().max(MINIMAX_MUSIC3_MAX_DURATION).default(prompt['7:12'].inputs.max_duration),
  model: z.string().min(1).default(prompt['7:9'].inputs.unet_name),
  sampler: z.string().min(1).default(prompt['7:15'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:15'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['7:15'].inputs.steps),
  tiledDecode: z.boolean().default(prompt['7:16'].inputs.switch),
  vae: z.string().min(1).default(prompt['7:11'].inputs.vae_name)
});

export default class MusicGenerateWithMiniMaxMusic3 extends ComfyUiWorkflow<MusicGenerateWithMiniMaxMusic3Params> {
  public static readonly fields: WorkflowFields<MusicGenerateWithMiniMaxMusic3Params> = makeTextToMusicFields(MINIMAX_MUSIC3_MAX_DURATION);
  public static readonly id: string = 'generate-music-minimax-music3';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.MUSIC_GENERATE;

  public override readonly advancedParams: Array<keyof MusicGenerateWithMiniMaxMusic3Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler', 'tiledDecode'];
  public override readonly outputKind: WorkflowOutputKind = 'audio';
  public override readonly outputNodeId = '19';
  public override readonly visibleParams: Array<keyof MusicGenerateWithMiniMaxMusic3Params> = ['captionPrompt', 'lyricsPrompt', 'maxDuration'];
  protected override readonly schema: z.ZodType<MusicGenerateWithMiniMaxMusic3Params> = MusicGenerateWithMiniMaxMusic3ParamsSchema;

  protected override buildPrompt(params: MusicGenerateWithMiniMaxMusic3Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['audio']
    )
      .setInputNode('model', '7:9.inputs.unet_name')
      .setInputNode('clip', '7:10.inputs.clip_name')
      .setInputNode('vae', '7:11.inputs.vae_name')
      .setInputNode('captionPrompt', '7:12.inputs.caption')
      .setInputNode('lyricsPrompt', '7:12.inputs.lyrics')
      .setInputNode('maxDuration', '7:12.inputs.max_duration')
      .setInputNode('seed', ['7:12.inputs.seed', '7:15.inputs.seed'])
      .setInputNode('steps', '7:15.inputs.steps')
      .setInputNode('cfg', ['7:12.inputs.cfg_scale', '7:15.inputs.cfg'])
      .setInputNode('sampler', '7:15.inputs.sampler_name')
      .setInputNode('scheduler', '7:15.inputs.scheduler')
      .setInputNode('tiledDecode', '7:16.inputs.switch')
      .setOutputNode('audio', this.outputNodeId)
      .input('model', params.model)
      .input('clip', params.clip)
      .input('vae', params.vae)
      .input('captionPrompt', params.captionPrompt)
      .input('lyricsPrompt', params.lyricsPrompt)
      .input('maxDuration', params.maxDuration)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('tiledDecode', params.tiledDecode)
      .workflow;
  }
}
