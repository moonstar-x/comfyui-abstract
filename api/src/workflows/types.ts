export const WORKFLOW_TYPES = {
  GENERATE_IMAGE: 'generate-image',
  EDIT_IMAGE: 'edit-image',
  GENERATE_MUSIC: 'generate-music',
  COVER_MUSIC: 'cover-music'
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
 * A list of images uploaded by the client through POST /uploads/image, sent as the returned references.
 */
export interface ImageListWorkflowField extends BaseWorkflowField {
  kind: 'image-list';
  /**
   * Maximum size of each file, in bytes.
   */
  maxBytes: number;
  maxImages: number;
}

/**
 * A single audio file uploaded by the client through POST /uploads/audio, sent as the returned reference.
 */
export interface AudioWorkflowField extends BaseWorkflowField {
  kind: 'audio';
  /**
   * Maximum size of the file, in bytes.
   */
  maxBytes: number;
}

/**
 * Describes how a workflow param is rendered in the client.
 */
export type WorkflowField =
  | AudioWorkflowField |
  BooleanWorkflowField |
  ImageListWorkflowField |
  LoraListWorkflowField |
  NumberWorkflowField |
  SelectWorkflowField |
  TextWorkflowField;

/**
 * Field descriptions of every param a workflow accepts, keyed by param name.
 */
export type WorkflowFields<TParams extends object = object> = Readonly<Record<Extract<keyof TParams, string>, WorkflowField>>;
