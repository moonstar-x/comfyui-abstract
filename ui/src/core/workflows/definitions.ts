import type { Nullable, Optional } from '@core/utils/types';
import type { WorkflowModel, WorkflowType } from '@services/websocket/messages/client';

export type WorkflowFieldGroup = 'advanced' | 'prompt' | 'settings';

interface BaseWorkflowField {
  description?: Optional<string>;
  group: WorkflowFieldGroup;
  key: string;
  label: string;
  required?: Optional<boolean>;
}

export interface TextWorkflowField extends BaseWorkflowField {
  defaultValue: string;
  kind: 'text';
  multiline?: Optional<boolean>;
  placeholder?: Optional<string>;
}

export interface NumberWorkflowField extends BaseWorkflowField {
  // A null default leaves the input empty so the API picks the value (e.g. a random seed).
  defaultValue: Nullable<number>;
  integer?: Optional<boolean>;
  kind: 'number';
  min?: Optional<number>;
  placeholder?: Optional<string>;
  step?: Optional<number>;
}

export interface SelectWorkflowField extends BaseWorkflowField {
  defaultValue: string;
  kind: 'select';
  options: readonly string[];
}

export type WorkflowField = NumberWorkflowField | SelectWorkflowField | TextWorkflowField;

export interface WorkflowModelDefinition<TType extends WorkflowType = WorkflowType> {
  description: string;
  fields: readonly WorkflowField[];
  id: WorkflowModel<TType>;
  label: string;
}

export interface WorkflowDefinition<TType extends WorkflowType = WorkflowType> {
  models: ReadonlyArray<WorkflowModelDefinition<TType>>;
  type: TType;
}

const KSAMPLER_SAMPLERS = [
  'euler',
  'euler_ancestral',
  'heun',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpmpp_2s_ancestral',
  'dpmpp_sde',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_3m_sde',
  'ddim',
  'uni_pc',
  'res_multistep'
] as const;

const KSAMPLER_SCHEDULERS = ['simple', 'normal', 'karras', 'exponential', 'sgm_uniform', 'beta', 'linear_quadratic', 'kl_optimal', 'ddim_uniform'] as const;

// TODO: This is dynamic and must come from the backend. Defaults mirror the ones saved in the API workflow JSON.
export const WORKFLOW_DEFINITIONS: { [TType in WorkflowType]: WorkflowDefinition<TType> } = {
  'generate-image': {
    type: 'generate-image',
    models: [
      {
        id: 'qwen-image-2.1',
        label: 'Qwen Image 2.1',
        description: 'Text-to-image generation with Qwen Image 2.1.',
        fields: [
          { group: 'prompt', key: 'positivePrompt', kind: 'text', label: 'Prompt', defaultValue: '', multiline: true, required: true, placeholder: 'Describe the image you want to generate…' },
          { group: 'prompt', key: 'negativePrompt', kind: 'text', label: 'Negative Prompt', defaultValue: '', multiline: true, placeholder: 'What to avoid in the image (optional)' },
          { group: 'settings', key: 'width', kind: 'number', label: 'Width', defaultValue: 1024, integer: true, min: 64, step: 64 },
          { group: 'settings', key: 'height', kind: 'number', label: 'Height', defaultValue: 1024, integer: true, min: 64, step: 64 },
          { group: 'settings', key: 'steps', kind: 'number', label: 'Steps', defaultValue: 25, integer: true, min: 1 },
          { group: 'settings', key: 'cfg', kind: 'number', label: 'CFG', defaultValue: 1, min: 0.1, step: 0.1 },
          { group: 'settings', key: 'sampler', kind: 'select', label: 'Sampler', defaultValue: 'euler', options: KSAMPLER_SAMPLERS },
          { group: 'settings', key: 'scheduler', kind: 'select', label: 'Scheduler', defaultValue: 'simple', options: KSAMPLER_SCHEDULERS },
          { group: 'settings', key: 'seed', kind: 'number', label: 'Seed', defaultValue: null, integer: true, placeholder: 'Random', description: 'Leave empty for a random seed.' },
          { group: 'advanced', key: 'model', kind: 'text', label: 'Diffusion Model', defaultValue: String.raw`qwen\qwen_image_2.1_int8_convrot.safetensors` },
          { group: 'advanced', key: 'clip', kind: 'text', label: 'Text Encoder', defaultValue: String.raw`qwen\qwen3vl_8b_int8_convrot.safetensors` },
          { group: 'advanced', key: 'vae', kind: 'text', label: 'VAE', defaultValue: String.raw`qwen\qwen_image_2.1_vae_bf16.safetensors` }
        ]
      }
    ]
  }
};

export const isWorkflowType = (value: Optional<string>): value is WorkflowType => value !== undefined && Object.hasOwn(WORKFLOW_DEFINITIONS, value);

export const findWorkflowModel = <TType extends WorkflowType>(
  definition: WorkflowDefinition<TType>,
  model: Nullable<string>
): Nullable<WorkflowModelDefinition<TType>> => definition.models.find((candidate) => candidate.id === model) ?? null;
