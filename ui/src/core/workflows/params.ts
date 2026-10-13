import { formatDateTime } from '@core/generations/generations';
import type { Nullable } from '@core/utils/types';
import type { AudioWorkflowField, ImageListWorkflowField, LoraListWorkflowField, NumberWorkflowField, WorkflowField, WorkflowLora } from '@core/workflows/definitions';
import type { UploadRecord } from '@services/api/uploads';

// LoRA rows keep their raw input strings so the strength can be edited freely before it's validated.
export interface LoraFormEntry {
  // Only used as a stable React key, never sent to the API.
  id: number;
  lora: string;
  strength: string;
}

interface BaseImageFormEntry {
  // Only used as a stable React key, never sent to the API.
  id: number;
  name: string;
  // Data URL of the file, only used for the preview.
  url: string;
}

// A file picked from the device, uploaded when the workflow runs, see uploadWorkflowFiles.
export interface FileImageFormEntry extends BaseImageFormEntry {
  file: File;
}

// A file uploaded earlier, sent as its reference without uploading it again.
export interface UploadImageFormEntry extends BaseImageFormEntry {
  reference: string;
}

export type ImageFormEntry = FileImageFormEntry | UploadImageFormEntry;

interface BaseAudioFormEntry {
  // Only used as a stable React key, never sent to the API.
  id: number;
  name: string;
}

// A file picked from the device, uploaded when the workflow runs, see uploadWorkflowFiles.
export interface FileAudioFormEntry extends BaseAudioFormEntry {
  file: File;
  // Data URL of the file, only used for the preview.
  url: string;
}

// A file uploaded earlier, sent as its reference without uploading it again.
export interface UploadAudioFormEntry extends BaseAudioFormEntry {
  reference: string;
  // Used to load the preview, since the API only serves the file to its owner.
  uploadId: string;
}

export type AudioFormEntry = FileAudioFormEntry | UploadAudioFormEntry;

// A missing audio file is stored as null, since a single file has no empty list to fall back to.
export type WorkflowFormValue = AudioFormEntry | boolean | ImageFormEntry[] | LoraFormEntry[] | null | string;
export type WorkflowFormValues = Record<string, WorkflowFormValue>;
export type WorkflowFormErrors = Record<string, string>;

// The value is left out of the params when undefined, so the API applies its own default.
type ParsedFieldResult = { error: string } | { value: unknown };

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

export const makeImageFormEntry = (file: File, url: string): FileImageFormEntry => ({ id: makeFormEntryId(), name: file.name, file, url });

const getUploadName = (upload: UploadRecord): string => `Upload from ${formatDateTime(upload.createdAt)}`;

export const makeUploadImageFormEntry = (upload: UploadRecord, url: string): UploadImageFormEntry => ({
  id: makeFormEntryId(),
  name: getUploadName(upload),
  reference: upload.comfyFilename,
  url
});

export const makeAudioFormEntry = (file: File, url: string): FileAudioFormEntry => ({ id: makeFormEntryId(), name: file.name, file, url });

export const makeUploadAudioFormEntry = (upload: UploadRecord): UploadAudioFormEntry => ({
  id: makeFormEntryId(),
  name: getUploadName(upload),
  reference: upload.comfyFilename,
  uploadId: upload.id
});

export const getLoraFormEntries = (value: WorkflowFormValue): LoraFormEntry[] => Array.isArray(value) ? value.filter((entry) => 'lora' in entry) : [];

export const getImageFormEntries = (value: WorkflowFormValue): ImageFormEntry[] => Array.isArray(value) ? value.filter((entry) => 'url' in entry) : [];

export const getAudioFormEntry = (value: WorkflowFormValue): Nullable<AudioFormEntry> => typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;

const isWorkflowLora = (value: unknown): value is Partial<WorkflowLora> & Pick<WorkflowLora, 'lora'> => typeof value === 'object' &&
  value !== null &&
  'lora' in value &&
  typeof value.lora === 'string';

/**
 * Params of an earlier generation to start the form from, instead of the config defaults.
 */
export type WorkflowPrefill = Record<string, unknown>;

const isWorkflowPrefill = (value: unknown): value is WorkflowPrefill => typeof value === 'object' && value !== null && !Array.isArray(value);

interface WorkflowPrefillState {
  prefill: { model: string; params: WorkflowPrefill };
}

/**
 * The location state that opens the workflow page with the form filled from an earlier generation of the given model.
 */
export const makeWorkflowPrefillState = (model: string, params: WorkflowPrefill): WorkflowPrefillState => ({ prefill: { model, params } });

/**
 * Reads the prefill from the location state of the workflow page, as long as it was made for the given model.
 */
export const getWorkflowPrefill = (state: unknown, model: string): Nullable<WorkflowPrefill> => {
  if (typeof state !== 'object' || state === null || !('prefill' in state)) {
    return null;
  }

  const { prefill } = state;
  if (typeof prefill !== 'object' || prefill === null || !('model' in prefill) || prefill.model !== model || !('params' in prefill)) {
    return null;
  }

  const { params } = prefill;
  return isWorkflowPrefill(params) ? params : null;
};

// A select option may have been removed from the config since the prefill was made.
const isUsableInitialValue = (field: WorkflowField, value: unknown): boolean => field.kind !== 'select' || (typeof value === 'string' && field.options.includes(value));

// Defaults come from the API config and prefills from earlier generations, so neither is guaranteed to match the field kind.
const makeInitialFormValue = (field: WorkflowField, prefill: Nullable<WorkflowPrefill>): WorkflowFormValue => {
  const prefillValue = prefill?.[field.key];
  const defaultValue = prefillValue !== undefined && isUsableInitialValue(field, prefillValue) ? prefillValue : field.defaultValue;

  // Images can't come from the API config or an earlier generation, they're always uploaded by the user.
  if (field.kind === 'image-list') {
    return [];
  }

  // Same goes for audio files.
  if (field.kind === 'audio') {
    return null;
  }

  // A switch has no empty state, so a missing default leaves it off.
  if (field.kind === 'boolean') {
    return defaultValue === true;
  }

  if (field.kind === 'lora-list') {
    return Array.isArray(defaultValue) ? defaultValue.filter(isWorkflowLora).map(({ lora, strength }) => makeLoraFormEntry(lora, strength)) : [];
  }

  return typeof defaultValue === 'string' || typeof defaultValue === 'number' ? String(defaultValue) : '';
};

export const makeInitialFormValues = (fields: readonly WorkflowField[], prefill: Nullable<WorkflowPrefill> = null): WorkflowFormValues => Object.fromEntries(
  fields.map((field) => [field.key, makeInitialFormValue(field, prefill)])
);

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

  if (field.max !== undefined && value > field.max) {
    return `Must be at most ${field.max.toString()}.`;
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

const parseImages = (field: ImageListWorkflowField, entries: readonly ImageFormEntry[]): Array<File | string> | string => {
  if (field.required === true && entries.length === 0) {
    return `${field.label} requires at least one image.`;
  }

  if (entries.length > field.maxImages) {
    return `${field.label} accepts at most ${field.maxImages.toString()} images.`;
  }

  return entries.map((entry) => 'file' in entry ? entry.file : entry.reference);
};

const parseAudio = (field: AudioWorkflowField, entry: Nullable<AudioFormEntry>): ParsedFieldResult => {
  if (entry === null) {
    return field.required === true ? { error: `${field.label} is required.` } : { value: undefined };
  }

  return { value: 'file' in entry ? entry.file : entry.reference };
};

const toParsedFieldResult = (result: string | unknown[]): ParsedFieldResult => typeof result === 'string' ? { error: result } : { value: result };

type UploadWorkflowField = AudioWorkflowField | ImageListWorkflowField | LoraListWorkflowField;

// Fields whose values aren't plain strings, each parsed by its own helper.
const UPLOAD_FIELD_KINDS: ReadonlySet<WorkflowField['kind']> = new Set(['audio', 'image-list', 'lora-list']);

const isUploadField = (field: WorkflowField): field is UploadWorkflowField => UPLOAD_FIELD_KINDS.has(field.kind);

const parseUploadField = (field: UploadWorkflowField, value: WorkflowFormValue): ParsedFieldResult => {
  switch (field.kind) {
    case 'audio':
      return parseAudio(field, getAudioFormEntry(value));
    case 'image-list':
      return toParsedFieldResult(parseImages(field, getImageFormEntries(value)));
    case 'lora-list':
      return toParsedFieldResult(parseLoras(field, getLoraFormEntries(value)));
  }
};

/**
 * Converts the raw form values into workflow params. Empty optional fields are left out so the API applies its own defaults.
 * Audio and image fields hold the selected files, which uploadWorkflowFiles replaces with their upload references.
 * Files picked from earlier uploads already hold their references.
 */
export const parseWorkflowParams = (fields: readonly WorkflowField[], values: WorkflowFormValues): ParsedWorkflowParams => {
  const params: Record<string, unknown> = {};
  const errors: WorkflowFormErrors = {};

  for (const field of fields) {
    const value = values[field.key];

    if (isUploadField(field)) {
      const result = parseUploadField(field, value ?? null);
      if ('error' in result) {
        errors[field.key] = result.error;
      } else if (result.value !== undefined) {
        params[field.key] = result.value;
      }

      continue;
    }

    if (field.kind === 'boolean') {
      params[field.key] = value === true;
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
