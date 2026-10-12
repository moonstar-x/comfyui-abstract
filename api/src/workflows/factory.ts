import { BadRequestError } from '../app/http/errors/BadRequestError.js';
import type { ComfyUiWorkflow, ComfyUiWorkflowClass } from '../services/comfyui/ComfyUiWorkflow.js';
import { getConfig } from '../services/config/config.js';
import type { AppConfig, WorkflowConfig } from '../services/config/schema.js';
import EditImageWithQwenImage21 from './edit-image/EditImageWithQwenImage21.js';
import GenerateMusicWithMiniMaxMusic3 from './generate-music/GenerateMusicWithMiniMaxMusic3.js';
import GenerateMusicWithYue2 from './generate-music/GenerateMusicWithYue2.js';
import GenerateImageWithKrea2 from './generate-image/GenerateImageWithKrea2.js';
import GenerateImageWithQwenImage21 from './generate-image/GenerateImageWithQwenImage21.js';
import type { WorkflowField, WorkflowType } from './types.js';

export interface WorkflowRequestParams {
  /**
   * Alias of the workflow in the config.
   */
  model: string;
  type: WorkflowType;
}

/**
 * A workflow param exposed to the client, in the order the config lists it.
 */
export type WorkflowFieldDefinition = WorkflowField & { defaultValue?: unknown; isAdvanced: boolean; key: string };

export interface WorkflowModelDefinition {
  alias: string;
  fields: WorkflowFieldDefinition[];
}

export interface WorkflowDefinition {
  models: WorkflowModelDefinition[];
  type: WorkflowType;
}

export interface ConfiguredWorkflow {
  /**
   * Params the workflow is run with: the config defaults, overridden by the client params, overridden by the server params.
   */
  params: Record<string, unknown>;
  workflow: ComfyUiWorkflow;
}

const WORKFLOW_IMPLEMENTATIONS: readonly ComfyUiWorkflowClass[] = [
  GenerateImageWithQwenImage21,
  GenerateImageWithKrea2,
  EditImageWithQwenImage21,
  GenerateMusicWithMiniMaxMusic3,
  GenerateMusicWithYue2
];

const findImplementation = (id: string): ComfyUiWorkflowClass | undefined => WORKFLOW_IMPLEMENTATIONS.find((implementation) => implementation.id === id);

const getClientParamKeys = (config: WorkflowConfig): string[] => [...config.params.visible, ...config.params.advanced];

const findDuplicates = (values: readonly string[]): string[] => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

const validateWorkflowConfig = (config: WorkflowConfig): string[] => {
  const implementation = findImplementation(config.workflow);
  if (implementation === undefined) {
    return [`workflow "${config.workflow}" does not exist. Available workflows: ${WORKFLOW_IMPLEMENTATIONS.map(({ id }) => id).join(', ')}.`];
  }

  const errors: string[] = [];
  if (implementation.type !== config.type) {
    errors.push(`workflow "${config.workflow}" is of type "${implementation.type}", not "${config.type}".`);
  }

  const clientKeys = getClientParamKeys(config);
  const serverKeys = Object.keys(config.serverParams);
  const referencedKeys = [...clientKeys, ...Object.keys(config.params.defaults), ...serverKeys];
  const unknownKeys = [...new Set(referencedKeys.filter((key) => !Object.hasOwn(implementation.fields, key)))];
  if (unknownKeys.length > 0) {
    errors.push(`unknown params ${unknownKeys.join(', ')}. Available params: ${Object.keys(implementation.fields).join(', ')}.`);
  }

  const repeatedKeys = findDuplicates([...clientKeys, ...serverKeys]);
  if (repeatedKeys.length > 0) {
    errors.push(`params ${repeatedKeys.join(', ')} must only appear once across params.visible, params.advanced and serverParams.`);
  }

  return errors;
};

/**
 * Ensures every workflow in the config references an existing implementation and only params that implementation accepts.
 */
export const validateWorkflowConfigs = (config: AppConfig): void => {
  const errors = config.workflows.flatMap((workflow) => validateWorkflowConfig(workflow).map((error) => `- ${workflow.type}/${workflow.alias}: ${error}`));

  const repeatedAliases = findDuplicates(config.workflows.map(({ type, alias }) => `${type}/${alias}`));
  errors.push(...repeatedAliases.map((alias) => `- ${alias}: alias is defined more than once.`));

  if (errors.length > 0) {
    throw new Error(`Config has invalid workflows:\n${errors.join('\n')}`);
  }
};

const getImplementation = (config: WorkflowConfig): ComfyUiWorkflowClass => {
  const implementation = findImplementation(config.workflow);
  if (implementation === undefined) {
    throw new Error(`Workflow ${config.workflow} does not exist.`);
  }

  return implementation;
};

const makeFieldDefinition = (config: WorkflowConfig, implementation: ComfyUiWorkflowClass, key: string, isAdvanced: boolean): WorkflowFieldDefinition => {
  const field = implementation.fields[key];
  if (field === undefined) {
    throw new Error(`Workflow ${config.workflow} does not accept the param ${key}.`);
  }

  const definition: WorkflowFieldDefinition = { ...field, key, isAdvanced };
  if (Object.hasOwn(config.params.defaults, key)) {
    definition.defaultValue = config.params.defaults[key];
  }

  return definition;
};

/**
 * Builds the definition the client uses to render the form of each workflow of the given type.
 * Server params are never included.
 */
export const getWorkflowDefinition = (type: WorkflowType): WorkflowDefinition => {
  const models = getConfig().workflows
    .filter((config) => config.type === type)
    .map((config) => {
      const implementation = getImplementation(config);
      return {
        alias: config.alias,
        fields: [
          ...config.params.visible.map((key) => makeFieldDefinition(config, implementation, key, false)),
          ...config.params.advanced.map((key) => makeFieldDefinition(config, implementation, key, true))
        ]
      };
    });

  return { type, models };
};

export const makeWorkflow = ({ type, model }: WorkflowRequestParams, clientParams: Record<string, unknown>): ConfiguredWorkflow => {
  const config = getConfig().workflows.find((candidate) => candidate.type === type && candidate.alias === model);
  if (config === undefined) {
    throw new BadRequestError(`There is no ${type} workflow with the model ${model}.`);
  }

  const clientKeys = new Set(getClientParamKeys(config));
  const forbiddenKeys = Object.keys(clientParams).filter((key) => !clientKeys.has(key));
  if (forbiddenKeys.length > 0) {
    throw new BadRequestError(`The ${type} workflow with the model ${model} does not accept the params: ${forbiddenKeys.join(', ')}.`);
  }

  const Implementation = getImplementation(config);
  return {
    workflow: new Implementation(),
    params: { ...config.params.defaults, ...clientParams, ...config.serverParams }
  };
};
