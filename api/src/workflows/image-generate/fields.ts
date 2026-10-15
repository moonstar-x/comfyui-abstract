import type { LoraListWorkflowField, WorkflowField } from '../types.js';

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

type TextToImageParam = 'cfg' | 'clip' | 'height' | 'model' | 'negativePrompt' | 'positivePrompt' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'vae' | 'width';

export const TEXT_TO_IMAGE_FIELDS: Readonly<Record<TextToImageParam, WorkflowField>> = {
  positivePrompt: { kind: 'text', label: 'Prompt', multiline: true, required: true, placeholder: 'Describe the image you want to generate…' },
  negativePrompt: { kind: 'text', label: 'Negative Prompt', multiline: true, placeholder: 'What to avoid in the image (optional)' },
  width: { kind: 'number', label: 'Width', integer: true, min: 64, step: 64 },
  height: { kind: 'number', label: 'Height', integer: true, min: 64, step: 64 },
  steps: { kind: 'number', label: 'Steps', integer: true, min: 1 },
  cfg: { kind: 'number', label: 'CFG', min: 0.1, step: 0.1 },
  sampler: { kind: 'select', label: 'Sampler', options: KSAMPLER_SAMPLERS },
  scheduler: { kind: 'select', label: 'Scheduler', options: KSAMPLER_SCHEDULERS },
  seed: { kind: 'number', label: 'Seed', integer: true, placeholder: 'Random', description: 'Leave empty for a random seed.' },
  model: { kind: 'text', label: 'Diffusion Model' },
  clip: { kind: 'text', label: 'Text Encoder' },
  vae: { kind: 'text', label: 'VAE' }
};

export const LORAS_FIELD: LoraListWorkflowField = { kind: 'lora-list', label: 'LoRA Models', minStrength: 0, maxStrength: 2 };

type ImageGenerateParam = 'cfg' | 'clip' | 'denoise' | 'height' | 'model' | 'prompt' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'vae' | 'width';

const { positivePrompt: _positivePrompt, negativePrompt: _negativePrompt, ...SHARED_FIELDS } = TEXT_TO_IMAGE_FIELDS;

export const IMAGE_GENERATE_FIELDS: Readonly<Record<ImageGenerateParam, WorkflowField>> = {
  prompt: { kind: 'text', label: 'Prompt', multiline: true, required: true, placeholder: 'Describe the image you want to generate…' },
  ...SHARED_FIELDS,
  denoise: { kind: 'number', label: 'Denoise', min: 0, max: 1, step: 0.05 }
};
