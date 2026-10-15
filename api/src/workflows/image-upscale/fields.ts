import { makeImagesField } from '../image-edit/fields.js';
import type { WorkflowField } from '../types.js';

type ImageUpscaleParam = 'images' | 'model';

export const IMAGE_UPSCALE_FIELDS: Readonly<Record<ImageUpscaleParam, WorkflowField>> = {
  images: { ...makeImagesField(1), label: 'Image' },
  model: { kind: 'text', label: 'Upscale Model' }
};
