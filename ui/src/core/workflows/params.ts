import type { WorkflowField } from '@core/workflows/definitions';

export type WorkflowFormValues = Record<string, string>;
export type WorkflowFormErrors = Record<string, string>;

export interface ParsedWorkflowParams {
  errors: WorkflowFormErrors;
  params: Record<string, unknown>;
}

export const makeInitialFormValues = (fields: readonly WorkflowField[]): WorkflowFormValues => Object.fromEntries(fields.map((field) => [field.key, field.defaultValue === null ? '' : String(field.defaultValue)]));

const parseNumber = (field: Extract<WorkflowField, { kind: 'number' }>, raw: string): number | string => {
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
 * Converts the raw form values into workflow params. Empty optional fields are left out so the API applies its own defaults.
 */
export const parseWorkflowParams = (fields: readonly WorkflowField[], values: WorkflowFormValues): ParsedWorkflowParams => {
  const params: Record<string, unknown> = {};
  const errors: WorkflowFormErrors = {};

  for (const field of fields) {
    const raw = values[field.key] ?? '';
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
