import type { LoraListWorkflowField, NumberWorkflowField, WorkflowField, WorkflowLora } from '@core/workflows/definitions';

// LoRA rows keep their raw input strings so the strength can be edited freely before it's validated.
export interface LoraFormEntry {
  // Only used as a stable React key, never sent to the API.
  id: number;
  lora: string;
  strength: string;
}

export type WorkflowFormValue = LoraFormEntry[] | string;
export type WorkflowFormValues = Record<string, WorkflowFormValue>;
export type WorkflowFormErrors = Record<string, string>;

export interface ParsedWorkflowParams {
  errors: WorkflowFormErrors;
  params: Record<string, unknown>;
}

export const DEFAULT_LORA_STRENGTH = 1;

const loraEntryIds = { last: 0 };
export const makeLoraFormEntry = (lora = '', strength = DEFAULT_LORA_STRENGTH): LoraFormEntry => {
  loraEntryIds.last += 1;
  return { id: loraEntryIds.last, lora, strength: strength.toString() };
};

const isWorkflowLora = (value: unknown): value is Partial<WorkflowLora> & Pick<WorkflowLora, 'lora'> => typeof value === 'object' &&
  value !== null &&
  'lora' in value &&
  typeof value.lora === 'string';

// Defaults come from the API config, so they're not guaranteed to match the field kind.
const makeInitialFormValue = (field: WorkflowField): WorkflowFormValue => {
  const { defaultValue } = field;

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

/**
 * Converts the raw form values into workflow params. Empty optional fields are left out so the API applies its own defaults.
 */
export const parseWorkflowParams = (fields: readonly WorkflowField[], values: WorkflowFormValues): ParsedWorkflowParams => {
  const params: Record<string, unknown> = {};
  const errors: WorkflowFormErrors = {};

  for (const field of fields) {
    const value = values[field.key];

    if (field.kind === 'lora-list') {
      const result = parseLoras(field, Array.isArray(value) ? value : []);
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
