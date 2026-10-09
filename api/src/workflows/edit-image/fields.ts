import { TEXT_TO_IMAGE_FIELDS } from '../generate-image/fields.js';
import type { ImageListWorkflowField, WorkflowField } from '../types.js';

type ImageEditParam = 'cfg' | 'clip' | 'model' | 'negativePrompt' | 'positivePrompt' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'vae';

const { width: _width, height: _height, ...TEXT_FIELDS } = TEXT_TO_IMAGE_FIELDS;

export const IMAGE_EDIT_FIELDS: Readonly<Record<ImageEditParam, WorkflowField>> = {
  ...TEXT_FIELDS,
  positivePrompt: { kind: 'text', label: 'Prompt', multiline: true, required: true, placeholder: 'Describe the changes you want to make…' }
};

export const makeImagesField = (maxImages: number): ImageListWorkflowField => ({ kind: 'image-list', label: 'Images', required: true, maxImages });
