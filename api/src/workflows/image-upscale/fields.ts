import { makeImagesField } from '../image-edit/fields.js';
import { IMAGE_GENERATE_FIELDS, TEXT_TO_IMAGE_FIELDS } from '../image-generate/fields.js';
import type { WorkflowField } from '../types.js';

type ImageUpscaleParam = 'images' | 'model';

export const IMAGE_UPSCALE_FIELDS: Readonly<Record<ImageUpscaleParam, WorkflowField>> = {
  images: { ...makeImagesField(1), label: 'Image' },
  model: { kind: 'text', label: 'Upscale Model' }
};

type DiffusionImageUpscaleParam = 'denoise' | 'images' | 'model' | 'multiplier' | 'sampler' | 'scheduler' | 'seed' | 'vae';

export const DIFFUSION_IMAGE_UPSCALE_FIELDS: Readonly<Record<DiffusionImageUpscaleParam, WorkflowField>> = {
  images: IMAGE_UPSCALE_FIELDS.images,
  multiplier: { kind: 'number', label: 'Multiplier', min: 1, step: 0.5, description: 'Factor the image is scaled by.' },
  seed: TEXT_TO_IMAGE_FIELDS.seed,
  sampler: TEXT_TO_IMAGE_FIELDS.sampler,
  scheduler: TEXT_TO_IMAGE_FIELDS.scheduler,
  denoise: IMAGE_GENERATE_FIELDS.denoise,
  model: TEXT_TO_IMAGE_FIELDS.model,
  vae: TEXT_TO_IMAGE_FIELDS.vae
};

type RefinedImageUpscaleParam = 'cfg' | 'clip' | 'denoise' | 'images' | 'model' | 'prompt' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'upscaleModel' | 'vae';

export const REFINED_IMAGE_UPSCALE_FIELDS: Readonly<Record<RefinedImageUpscaleParam, WorkflowField>> = {
  images: IMAGE_UPSCALE_FIELDS.images,
  prompt: { kind: 'text', label: 'Prompt', multiline: true, placeholder: 'Describe the details to bring out in the image…' },
  seed: TEXT_TO_IMAGE_FIELDS.seed,
  steps: TEXT_TO_IMAGE_FIELDS.steps,
  cfg: TEXT_TO_IMAGE_FIELDS.cfg,
  sampler: TEXT_TO_IMAGE_FIELDS.sampler,
  scheduler: TEXT_TO_IMAGE_FIELDS.scheduler,
  denoise: IMAGE_GENERATE_FIELDS.denoise,
  model: TEXT_TO_IMAGE_FIELDS.model,
  clip: TEXT_TO_IMAGE_FIELDS.clip,
  vae: TEXT_TO_IMAGE_FIELDS.vae,
  upscaleModel: IMAGE_UPSCALE_FIELDS.model
};
