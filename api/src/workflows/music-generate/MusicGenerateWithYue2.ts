import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import type { WorkflowOutputKind } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import prompt from '../_json/music-generate/music-generate-yue2.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { makeYuE2MusicFields, YUE2_MODES } from './fields.js';

const YUE2_MAX_DURATION = 900;

export interface MusicGenerateWithYue2Params {
  abcPlanning: boolean;
  cfg: number;
  denoise: number;
  lyricsPrompt: string;
  maxDuration: number;
  mode: typeof YUE2_MODES[number];
  model: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  stylePrompt: string;
}

// Everything except the style and lyrics prompt defaults to the values saved in the workflow.
const MusicGenerateWithYue2ParamsSchema: z.ZodType<MusicGenerateWithYue2Params> = z.object({
  abcPlanning: z.boolean().default(prompt['7:10'].inputs.switch),
  cfg: z.number().positive().default(prompt['7:15'].inputs.cfg),
  denoise: z.number().min(0).max(1).default(prompt['7:15'].inputs.denoise),
  lyricsPrompt: z.string().min(1),
  maxDuration: z.number().positive().max(YUE2_MAX_DURATION).default(prompt['7:13'].inputs.max_duration),
  mode: z.enum(YUE2_MODES).default(z.enum(YUE2_MODES).parse(prompt['7:11'].inputs.mode)),
  model: z.string().min(1).default(prompt['7:9'].inputs.ckpt_name),
  sampler: z.string().min(1).default(prompt['7:15'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['7:15'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['7:15'].inputs.steps),
  stylePrompt: z.string().min(1)
});

export default class MusicGenerateWithYue2 extends ComfyUiWorkflow<MusicGenerateWithYue2Params> {
  public static readonly fields: WorkflowFields<MusicGenerateWithYue2Params> = makeYuE2MusicFields(YUE2_MAX_DURATION);
  public static readonly id: string = 'music-generate-yue2';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.MUSIC_GENERATE;

  public override readonly advancedParams: Array<keyof MusicGenerateWithYue2Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler', 'abcPlanning', 'denoise'];
  public override readonly outputKind: WorkflowOutputKind = 'audio';
  public override readonly outputNodeId = '18';
  public override readonly visibleParams: Array<keyof MusicGenerateWithYue2Params> = ['stylePrompt', 'lyricsPrompt', 'maxDuration', 'mode'];
  protected override readonly schema: z.ZodType<MusicGenerateWithYue2Params> = MusicGenerateWithYue2ParamsSchema;

  protected override buildPrompt(params: MusicGenerateWithYue2Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['audio']
    )
      .setInputNode('model', '7:9.inputs.ckpt_name')
      .setInputNode('stylePrompt', ['7:11.inputs.style', '7:13.inputs.style'])
      .setInputNode('lyricsPrompt', ['7:11.inputs.lyrics', '7:13.inputs.lyrics'])
      .setInputNode('seed', ['7:11.inputs.seed', '7:13.inputs.seed', '7:15.inputs.seed'])
      .setInputNode('steps', '7:15.inputs.steps')
      .setInputNode('cfg', ['7:13.inputs.cfg_scale', '7:15.inputs.cfg'])
      .setInputNode('sampler', '7:15.inputs.sampler_name')
      .setInputNode('scheduler', '7:15.inputs.scheduler')
      .setInputNode('denoise', '7:15.inputs.denoise')
      .setInputNode('mode', ['7:11.inputs.mode', '7:13.inputs.mode'])
      .setInputNode('maxDuration', '7:13.inputs.max_duration')
      .setInputNode('abcPlanning', '7:10.inputs.switch')
      .setOutputNode('audio', this.outputNodeId)
      .input('model', params.model)
      .input('stylePrompt', params.stylePrompt)
      .input('lyricsPrompt', params.lyricsPrompt)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('denoise', params.denoise)
      .input('mode', params.mode)
      .input('maxDuration', params.maxDuration)
      .input('abcPlanning', params.abcPlanning)
      .workflow;
  }
}
