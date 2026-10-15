import { UPLOAD_KIND_CONFIGS } from '../../services/uploads/uploads.js';
import { TEXT_TO_IMAGE_FIELDS } from '../generate-image/fields.js';
import type { ImageListWorkflowField, WorkflowField } from '../types.js';

type ImageEditParam = 'cfg' | 'clip' | 'denoise' | 'model' | 'negativePrompt' | 'prompt' | 'resolution' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'vae';

const { width: _width, height: _height, positivePrompt: _positivePrompt, ...TEXT_FIELDS } = TEXT_TO_IMAGE_FIELDS;

export const IMAGE_EDIT_FIELDS: Readonly<Record<ImageEditParam, WorkflowField>> = {
  prompt: { kind: 'text', label: 'Prompt', multiline: true, required: true, placeholder: 'Describe the changes you want to make…' },
  ...TEXT_FIELDS,
  resolution: { kind: 'number', label: 'Resolution', integer: true, min: 64, step: 64, description: 'Size the input images are scaled to before encoding.' },
  denoise: { kind: 'number', label: 'Denoise', min: 0, max: 1, step: 0.05 }
};

export const makeImagesField = (maxImages: number): ImageListWorkflowField => ({ kind: 'image-list', label: 'Images', required: true, maxImages, maxBytes: UPLOAD_KIND_CONFIGS.image.maxBytes });
