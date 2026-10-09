import type { Nullable, Optional } from '@core/utils/types';
import { WORKFLOW_TYPES } from '@services/websocket/messages/client';
import type { WorkflowType } from '@services/websocket/messages/client';

interface BaseWorkflowField {
  // Value from the API config used to pre-populate the field. Missing when the API should pick the value (e.g. a random seed).
  defaultValue?: Optional<unknown>;
  description?: Optional<string>;
  isAdvanced: boolean;
  key: string;
  label: string;
  required?: Optional<boolean>;
}

export interface TextWorkflowField extends BaseWorkflowField {
  kind: 'text';
  multiline?: Optional<boolean>;
  placeholder?: Optional<string>;
}

export interface NumberWorkflowField extends BaseWorkflowField {
  integer?: Optional<boolean>;
  kind: 'number';
  min?: Optional<number>;
  placeholder?: Optional<string>;
  step?: Optional<number>;
}

export interface SelectWorkflowField extends BaseWorkflowField {
  kind: 'select';
  options: readonly string[];
}

export interface WorkflowLora {
  lora: string;
  strength: number;
}

export interface LoraListWorkflowField extends BaseWorkflowField {
  kind: 'lora-list';
  maxStrength: number;
  minStrength: number;
  placeholder?: Optional<string>;
}

export type WorkflowField = LoraListWorkflowField | NumberWorkflowField | SelectWorkflowField | TextWorkflowField;

export interface WorkflowModelDefinition {
  alias: string;
  // Ordered as listed in the API config, visible fields first.
  fields: readonly WorkflowField[];
}

export interface WorkflowDefinition {
  models: readonly WorkflowModelDefinition[];
  type: WorkflowType;
}

const WORKFLOW_TYPE_VALUES: readonly string[] = WORKFLOW_TYPES;

export const isWorkflowType = (value: Optional<string>): value is WorkflowType => value !== undefined && WORKFLOW_TYPE_VALUES.includes(value);

export const findWorkflowModel = (
  definition: WorkflowDefinition,
  alias: Nullable<string>
): Nullable<WorkflowModelDefinition> => definition.models.find((candidate) => candidate.alias === alias) ?? null;
