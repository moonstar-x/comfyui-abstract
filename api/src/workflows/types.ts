export const WORKFLOW_TYPES = {
  GENERATE_IMAGE: 'generate-image',
  EDIT_IMAGE: 'edit-image',
  GENERATE_AUDIO: 'generate-audio'
} as const;
export type WorkflowType = typeof WORKFLOW_TYPES[keyof typeof WORKFLOW_TYPES];

interface BaseWorkflowField {
  description?: string;
  label: string;
  required?: boolean;
}

export interface TextWorkflowField extends BaseWorkflowField {
  kind: 'text';
  multiline?: boolean;
  placeholder?: string;
}

export interface NumberWorkflowField extends BaseWorkflowField {
  integer?: boolean;
  kind: 'number';
  max?: number;
  min?: number;
  placeholder?: string;
  step?: number;
}

export interface BooleanWorkflowField extends BaseWorkflowField {
  kind: 'boolean';
}

export interface SelectWorkflowField extends BaseWorkflowField {
  kind: 'select';
  options: readonly string[];
}

export interface LoraListWorkflowField extends BaseWorkflowField {
  kind: 'lora-list';
  maxStrength: number;
  minStrength: number;
  placeholder?: string;
}

/**
 * A list of images uploaded by the client, sent as base64 strings without the data URL prefix.
 */
export interface ImageListWorkflowField extends BaseWorkflowField {
  kind: 'image-list';
  maxImages: number;
}

/**
 * Describes how a workflow param is rendered in the client.
 */
export type WorkflowField = BooleanWorkflowField | ImageListWorkflowField | LoraListWorkflowField | NumberWorkflowField | SelectWorkflowField | TextWorkflowField;

/**
 * Field descriptions of every param a workflow accepts, keyed by param name.
 */
export type WorkflowFields<TParams extends object = object> = Readonly<Record<Extract<keyof TParams, string>, WorkflowField>>;
