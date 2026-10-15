import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import type { WorkflowOutputKind } from '../../services/comfyui/ComfyUiWorkflow.js';
import { makeRandomSeed } from '../../services/comfyui/utils.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../json/cover-music-yue2.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { makeYuE2CoverFields } from './fields.js';

const YUE2_MAX_DURATION = 900;

export interface CoverMusicWithYue2Params {
  audioEncoder: string;
  cfg: number;
  lyricsPrompt: string;
  maxDuration: number;
  model: string;
  sampler: string;
  scheduler: string;
  seed: number;
  song: string;
  steps: number;
  stylePrompt: string;
}

// Everything except the song, style and lyrics prompt defaults to the values saved in the workflow.
const CoverMusicWithYue2ParamsSchema: z.ZodType<CoverMusicWithYue2Params> = z.object({
  audioEncoder: z.string().min(1).default(prompt['59'].inputs.audio_encoder_name),
  cfg: z.number().positive().default(prompt['23'].inputs.value),
  lyricsPrompt: z.string().min(1),
  maxDuration: z.number().positive().max(YUE2_MAX_DURATION).default(prompt['36'].inputs.value),
  model: z.string().min(1).default(prompt['44'].inputs.ckpt_name),
  stylePrompt: z.string().min(1),
  sampler: z.string().min(1).default(prompt['51'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['51'].inputs.scheduler),
  seed: z.number().int().default(makeRandomSeed),
  song: makeUploadReferenceSchema(UPLOAD_KINDS.AUDIO),
  steps: z.number().int().positive().default(prompt['52'].inputs.value)
});

export default class CoverMusicWithYue2 extends ComfyUiWorkflow<CoverMusicWithYue2Params> {
  public static readonly fields: WorkflowFields<CoverMusicWithYue2Params> = makeYuE2CoverFields(YUE2_MAX_DURATION);
  public static readonly id: string = 'cover-music-yue2';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.COVER_MUSIC;

  public override readonly advancedParams: Array<keyof CoverMusicWithYue2Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler'];
  public override readonly outputKind: WorkflowOutputKind = 'audio';
  public override readonly outputNodeId = '57';
  public override readonly visibleParams: Array<keyof CoverMusicWithYue2Params> = ['song', 'stylePrompt', 'lyricsPrompt', 'maxDuration'];
  protected override readonly schema: z.ZodType<CoverMusicWithYue2Params> = CoverMusicWithYue2ParamsSchema;

  protected override buildPrompt(params: CoverMusicWithYue2Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['audio']
    )
      .setInputNode('model', '44.inputs.ckpt_name')
      .setInputNode('audioEncoder', '59.inputs.audio_encoder_name')
      .setInputNode('stylePrompt', '16.inputs.value')
      .setInputNode('lyricsPrompt', '17.inputs.value')
      .setInputNode('seed', '21.inputs.value')
      .setInputNode('maxDuration', '36.inputs.value')
      .setInputNode('cfg', '23.inputs.value')
      .setInputNode('steps', '52.inputs.value')
      .setInputNode('sampler', '51.inputs.sampler_name')
      .setInputNode('scheduler', '51.inputs.scheduler')
      .setInputNode('song', '58.inputs.audio')
      .setOutputNode('audio', this.outputNodeId)
      .input('model', params.model)
      .input('audioEncoder', params.audioEncoder)
      .input('stylePrompt', params.stylePrompt)
      .input('lyricsPrompt', params.lyricsPrompt)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('maxDuration', params.maxDuration)
      .input('song', params.song)
      .workflow;
  }
}
