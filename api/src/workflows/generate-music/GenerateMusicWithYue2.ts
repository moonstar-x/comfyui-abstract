import { PromptBuilder } from '@saintno/comfyui-sdk';
import type { NodeData } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { ComfyUiWorkflow } from '../../services/comfyui/ComfyUiWorkflow.js';
import type { WorkflowOutputKind } from '../../services/comfyui/ComfyUiWorkflow.js';
import { SeedSchema } from '../../services/comfyui/utils.js';
import prompt from '../json/generate-music-yue2.json' with { type: 'json' };
import { WORKFLOW_TYPES } from '../types.js';
import type { WorkflowFields, WorkflowType } from '../types.js';
import { makeYuE2MusicFields, YUE2_MODES } from './fields.js';

const YUE2_MAX_DURATION = 900;

export interface GenerateMusicWithYue2Params {
  abcPlanning: boolean;
  cfg: number;
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
const GenerateMusicWithYue2ParamsSchema: z.ZodType<GenerateMusicWithYue2Params> = z.object({
  abcPlanning: z.boolean().default(prompt['33'].inputs.value),
  cfg: z.number().positive().default(prompt['23'].inputs.value),
  lyricsPrompt: z.string().min(1),
  maxDuration: z.number().positive().max(YUE2_MAX_DURATION).default(prompt['36'].inputs.value),
  mode: z.enum(YUE2_MODES).default(z.enum(YUE2_MODES).parse(prompt['45'].inputs.mode)),
  model: z.string().min(1).default(prompt['44'].inputs.ckpt_name),
  stylePrompt: z.string().min(1),
  sampler: z.string().min(1).default(prompt['51'].inputs.sampler_name),
  scheduler: z.string().min(1).default(prompt['51'].inputs.scheduler),
  seed: SeedSchema,
  steps: z.number().int().positive().default(prompt['52'].inputs.value)
});

export default class GenerateMusicWithYue2 extends ComfyUiWorkflow<GenerateMusicWithYue2Params> {
  public static readonly fields: WorkflowFields<GenerateMusicWithYue2Params> = makeYuE2MusicFields(YUE2_MAX_DURATION);
  public static readonly id: string = 'generate-music-yue2';
  public static readonly type: WorkflowType = WORKFLOW_TYPES.GENERATE_MUSIC;

  public override readonly advancedParams: Array<keyof GenerateMusicWithYue2Params> = ['seed', 'steps', 'cfg', 'sampler', 'scheduler', 'abcPlanning'];
  public override readonly outputKind: WorkflowOutputKind = 'audio';
  public override readonly outputNodeId = '57';
  public override readonly visibleParams: Array<keyof GenerateMusicWithYue2Params> = ['stylePrompt', 'lyricsPrompt', 'maxDuration', 'mode'];
  protected override readonly schema: z.ZodType<GenerateMusicWithYue2Params> = GenerateMusicWithYue2ParamsSchema;

  protected override buildPrompt(params: GenerateMusicWithYue2Params): NodeData {
    return new PromptBuilder(
      prompt,
      this.getWorkflowParams(),
      ['audio']
    )
      .setInputNode('model', '44.inputs.ckpt_name')
      .setInputNode('stylePrompt', '16.inputs.value')
      .setInputNode('lyricsPrompt', '17.inputs.value')
      .setInputNode('cfg', '23.inputs.value')
      .setInputNode('sampler', '51.inputs.sampler_name')
      .setInputNode('scheduler', '51.inputs.scheduler')
      .setInputNode('seed', '21.inputs.value')
      .setInputNode('steps', '52.inputs.value')
      .setInputNode('maxDuration', '36.inputs.value')
      .setInputNode('abcPlanning', '33.inputs.value')
      .setInputNode('mode', ['45.inputs.mode', '49.inputs.mode'])
      .setOutputNode('audio', this.outputNodeId)
      .input('model', params.model)
      .input('stylePrompt', params.stylePrompt)
      .input('lyricsPrompt', params.lyricsPrompt)
      .input('cfg', params.cfg)
      .input('sampler', params.sampler)
      .input('scheduler', params.scheduler)
      .input('seed', params.seed)
      .input('steps', params.steps)
      .input('maxDuration', params.maxDuration)
      .input('abcPlanning', params.abcPlanning)
      .input('mode', params.mode)
      .workflow;
  }
}
