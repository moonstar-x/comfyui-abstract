import type { ImageListWorkflowField, LoraListWorkflowField, NumberWorkflowField, WorkflowField, WorkflowLora } from '@core/workflows/definitions';

// LoRA rows keep their raw input strings so the strength can be edited freely before it's validated.
export interface LoraFormEntry {
  // Only used as a stable React key, never sent to the API.
  id: number;
  lora: string;
  strength: string;
}

export interface ImageFormEntry {
  // Only used as a stable React key, never sent to the API.
  id: number;
  name: string;
  // Data URL of the file, used for the preview. Only its base64 part is sent to the API.
  url: string;
}

export type WorkflowFormValue = ImageFormEntry[] | LoraFormEntry[] | string;
export type WorkflowFormValues = Record<string, WorkflowFormValue>;
export type WorkflowFormErrors = Record<string, string>;

export interface ParsedWorkflowParams {
  errors: WorkflowFormErrors;
  params: Record<string, unknown>;
}

export const DEFAULT_LORA_STRENGTH = 1;

const formEntryIds = { last: 0 };
const makeFormEntryId = (): number => {
  formEntryIds.last += 1;
  return formEntryIds.last;
};

export const makeLoraFormEntry = (lora = '', strength = DEFAULT_LORA_STRENGTH): LoraFormEntry => ({ id: makeFormEntryId(), lora, strength: strength.toString() });

export const makeImageFormEntry = (name: string, url: string): ImageFormEntry => ({ id: makeFormEntryId(), name, url });

export const getLoraFormEntries = (value: WorkflowFormValue): LoraFormEntry[] => Array.isArray(value) ? value.filter((entry) => 'lora' in entry) : [];

export const getImageFormEntries = (value: WorkflowFormValue): ImageFormEntry[] => Array.isArray(value) ? value.filter((entry) => 'url' in entry) : [];

const isWorkflowLora = (value: unknown): value is Partial<WorkflowLora> & Pick<WorkflowLora, 'lora'> => typeof value === 'object' &&
  value !== null &&
  'lora' in value &&
  typeof value.lora === 'string';

// Defaults come from the API config, so they're not guaranteed to match the field kind.
const makeInitialFormValue = (field: WorkflowField): WorkflowFormValue => {
  const { defaultValue } = field;

  // Images can't come from the API config, they're always uploaded by the user.
  if (field.kind === 'image-list') {
    return [];
  }

  if (field.kind === 'lora-list') {
    return Array.isArray(defaultValue) ? defaultValue.filter(isWorkflowLora).map(({ lora, strength }) => makeLoraFormEntry(lora, strength)) : [];
  }

  return typeof defaultValue === 'string' || typeof defaultValue === 'number' ? String(defaultValue) : '';
};

export const makeInitialFormValues = (fields: readonly WorkflowField[]): WorkflowFormValues => Object.fromEntries(fields.map((field) => [field.key, makeInitialFormValue(field)]));

const parseNumber = (field: NumberWorkflowField, raw: string): number | string => {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return 'Must be a number.';
  }

  if (field.integer === true && !Number.isSafeInteger(value)) {
    return 'Must be a whole number.';
  }

  if (field.min !== undefined && value < field.min) {
    return `Must be at least ${field.min.toString()}.`;
  }

  return value;
};

/**
 * Rows without a LoRA name are ignored, and a blank strength falls back to the default.
 */
const parseLoras = (field: LoraListWorkflowField, entries: readonly LoraFormEntry[]): string | WorkflowLora[] => {
  const loras: WorkflowLora[] = [];

  for (const [index, entry] of entries.entries()) {
    const lora = entry.lora.trim();
    if (lora === '') {
      continue;
    }

    const rawStrength = entry.strength.trim();
    const strength = rawStrength === '' ? DEFAULT_LORA_STRENGTH : Number(rawStrength);
    if (!Number.isFinite(strength) || strength < field.minStrength || strength > field.maxStrength) {
      return `LoRA ${(index + 1).toString()}: strength must be between ${field.minStrength.toString()} and ${field.maxStrength.toString()}.`;
    }

    loras.push({ lora, strength });
  }

  if (field.required === true && loras.length === 0) {
    return `${field.label} requires at least one LoRA.`;
  }

  return loras;
};

const parseImages = (field: ImageListWorkflowField, entries: readonly ImageFormEntry[]): string | string[] => {
  if (field.required === true && entries.length === 0) {
    return `${field.label} requires at least one image.`;
  }

  if (entries.length > field.maxImages) {
    return `${field.label} accepts at most ${field.maxImages.toString()} images.`;
  }

  // The API expects plain base64, without the data URL prefix.
  return entries.map(({ url }) => url.slice(url.indexOf(',') + 1));
};

const parseListField = (field: ImageListWorkflowField | LoraListWorkflowField, value: WorkflowFormValue): string | unknown[] => field.kind === 'image-list'
  ? parseImages(field, getImageFormEntries(value))
  : parseLoras(field, getLoraFormEntries(value));

/**
 * Converts the raw form values into workflow params. Empty optional fields are left out so the API applies its own defaults.
 */
export const parseWorkflowParams = (fields: readonly WorkflowField[], values: WorkflowFormValues): ParsedWorkflowParams => {
  const params: Record<string, unknown> = {};
  const errors: WorkflowFormErrors = {};

  for (const field of fields) {
    const value = values[field.key];

    if (field.kind === 'image-list' || field.kind === 'lora-list') {
      const result = parseListField(field, value ?? []);
      if (typeof result === 'string') {
        errors[field.key] = result;
      } else {
        params[field.key] = result;
      }

      continue;
    }

    const raw = typeof value === 'string' ? value : '';
    const isEmpty = raw.trim() === '';

    if (isEmpty) {
      if (field.required === true) {
        errors[field.key] = `${field.label} is required.`;
      } else if (field.kind === 'text' && field.multiline === true) {
        // An intentionally empty multiline prompt is a valid value, not a missing one.
        params[field.key] = '';
      }

      continue;
    }

    if (field.kind === 'number') {
      const result = parseNumber(field, raw);
      if (typeof result === 'string') {
        errors[field.key] = result;
      } else {
        params[field.key] = result;
      }

      continue;
    }

    params[field.key] = raw;
  }

  return { params, errors };
};
