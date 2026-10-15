import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import type { WorkflowOutputKind } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import { makeUploadReferenceSchema, UPLOAD_KINDS } from '../../services/uploads/uploads.js';
import prompt from '../json/music-cover/music-cover-yue2.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { makeYuE2CoverFields } from './fields.js';

const YUE2_MAX_DURATION = 900;

export interface MusicCoverWithYue2Params {
  audioEncoder: string;
  cfg: number;
  denoise: number;
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
const MusicCoverWithYue2ParamsSchema: z.ZodType<MusicCoverWithYue2Params> = z.object({
  audioEncoder: z.string().min(1).default(prompt['7:10'].inputs.audio_encoder_name),
  cfg: z.number().positive().default(prompt['7:15'].inputs.cfg),
  denoise: z.number().min(0).max(1).default(prompt['7:15'].inputs.denoise),
  lyricsPrompt: z.string().min(1),
  maxDuration: z.number().positive().max(YUE2_MAX_DURATION).default(prompt['7:12'].inputs.max_duration),
  model: z.string().min(1).default(prompt['7:9'].inputs.ckpt_name),
  sampler: z.string().min(1).default(prompt['7:15'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:15'].inputs.scheduler),
  seed: SeedSchema,
  song: makeUploadReferenceSchema(UPLOAD_KINDS.AUDIO),
  steps: z.number().int().positive().default(prompt['7:15'].inputs.steps),
  stylePrompt: z.string().min(1)
});

export default class MusicCoverWithYue2 extends ComfyUiWorkflow<MusicCoverWithYue2Params> {
  public static readonly fields: WorkflowFields<MusicCoverWithYue2Params> = makeYuE2CoverFields(YUE2_MAX_DURATION);
  public static readonly id: string = 'music-cover-yue2';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.MUSIC_COVER;

  public override readonly advancedParams: Array<keyof MusicCoverWithYue2Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler', 'denoise'];
  public override readonly outputKind: WorkflowOutputKind = 'audio';
  public override readonly outputNodeId = '18';
  public override readonly visibleParams: Array<keyof MusicCoverWithYue2Params> = ['song', 'stylePrompt', 'lyricsPrompt', 'maxDuration'];
  protected override readonly schema: z.ZodType<MusicCoverWithYue2Params> = MusicCoverWithYue2ParamsSchema;

  protected override buildPrompt(params: MusicCoverWithYue2Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['audio']
    )
      .setInputNode('model', '7:9.inputs.ckpt_name')
      .setInputNode('audioEncoder', '7:10.inputs.audio_encoder_name')
      .setInputNode('song', '17.inputs.audio')
      .setInputNode('stylePrompt', '7:12.inputs.style')
      .setInputNode('lyricsPrompt', '7:12.inputs.lyrics')
      .setInputNode('seed', ['7:12.inputs.seed', '7:15.inputs.seed'])
      .setInputNode('steps', '7:15.inputs.steps')
      .setInputNode('cfg', ['7:12.inputs.cfg_scale', '7:15.inputs.cfg'])
      .setInputNode('sampler', '7:15.inputs.sampler_name')
      .setInputNode('scheduler', '7:15.inputs.scheduler')
      .setInputNode('denoise', '7:15.inputs.denoise')
      .setInputNode('maxDuration', '7:12.inputs.max_duration')
      .setOutputNode('audio', this.outputNodeId)
      .input('model', params.model)
      .input('audioEncoder', params.audioEncoder)
      .input('song', params.song)
      .input('stylePrompt', params.stylePrompt)
      .input('lyricsPrompt', params.lyricsPrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise)
      .input('maxDuration', params.maxDuration)
      .workflow;
  }
}
