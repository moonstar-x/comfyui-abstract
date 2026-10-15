import { BadRequestError } from '../app/http/errors/BadRequestError.js';
import type { ComfyUiWorkflowClass, ComfyUiWorkflowInstance } from '../services/comfyui/ComfyUiWorkflow.js';
import { getConfig } from '../services/config/config.js';
import type { AppConfig, WorkflowConfig } from '../services/config/schema.js';
import CoverMusicWithYue2 from './cover-music/CoverMusicWithYue2.js';
import ImageEditWithQwenImage21 from './image-edit/ImageEditWithQwenImage21.js';
import GenerateImageWithKrea2 from './generate-image/GenerateImageWithKrea2.js';
import GenerateImageWithQwenImage21 from './generate-image/GenerateImageWithQwenImage21.js';
import GenerateMusicWithMiniMaxMusic3 from './generate-music/GenerateMusicWithMiniMaxMusic3.js';
import GenerateMusicWithYue2 from './generate-music/GenerateMusicWithYue2.js';
import type { WorkflowField, WorkflowType } from './types.js';

export interface WorkflowRequestParams {
  /**
   * Alias of the workflow in the config.
   */
  model: string;
  type: WorkflowType;
}

/**
 * A workflow param exposed to the client, in the order the workflow implementation lists it.
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
  workflow: ComfyUiWorkflowInstance;
  /**
   * Identifier of the workflow implementation, as referenced by the config.
   */
  workflowId: string;
}

const WORKFLOW_IMPLEMENTATIONS: readonly ComfyUiWorkflowClass[] = [
  GenerateImageWithQwenImage21,
  GenerateImageWithKrea2,
  ImageEditWithQwenImage21,
  GenerateMusicWithMiniMaxMusic3,
  GenerateMusicWithYue2,
  CoverMusicWithYue2
];

const findImplementation = (id: string): ComfyUiWorkflowClass | undefined => WORKFLOW_IMPLEMENTATIONS.find((implementation) => implementation.id === id);

/**
 * Params the client may send: the visible and advanced params of the implementation, except the ones the config sets as server params.
 */
const getClientParamKeys = (config: WorkflowConfig, workflow: ComfyUiWorkflowInstance): { advanced: string[]; visible: string[] } => {
  const omitServerParamKeys = (keys: readonly PropertyKey[]): string[] => keys.map(String).filter((key) => !Object.hasOwn(config.serverParams, key));
  return { visible: omitServerParamKeys(workflow.visibleParams), advanced: omitServerParamKeys(workflow.advancedParams) };
};

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

  const referencedKeys = [...Object.keys(config.params.defaults), ...Object.keys(config.serverParams)];
  const unknownKeys = [...new Set(referencedKeys.filter((key) => !Object.hasOwn(implementation.fields, key)))];
  if (unknownKeys.length > 0) {
    errors.push(`unknown params ${unknownKeys.join(', ')}. Available params: ${Object.keys(implementation.fields).join(', ')}.`);
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
      const Implementation = getImplementation(config);
      const { visible, advanced } = getClientParamKeys(config, new Implementation());
      return {
        alias: config.alias,
        fields: [
          ...visible.map((key) => makeFieldDefinition(config, Implementation, key, false)),
          ...advanced.map((key) => makeFieldDefinition(config, Implementation, key, true))
        ]
      };
    });

  return { type, models };
};

const findWorkflowConfig = ({ type, model }: WorkflowRequestParams): undefined | WorkflowConfig => getConfig().workflows
  .find((candidate) => candidate.type === type && candidate.alias === model);

/**
 * Leaves out the server params of a workflow, which clients must never see. Params of workflows no longer in the config are kept as they are,
 * since there is no way to tell which of them were server params.
 */
export const omitServerParams = (request: WorkflowRequestParams, params: Record<string, unknown>): Record<string, unknown> => {
  const config = findWorkflowConfig(request);
  if (config === undefined) {
    return params;
  }

  return Object.fromEntries(Object.entries(params).filter(([key]) => !Object.hasOwn(config.serverParams, key)));
};

export const makeWorkflow = ({ type, model }: WorkflowRequestParams, clientParams: Record<string, unknown>): ConfiguredWorkflow => {
  const config = findWorkflowConfig({ type, model });
  if (config === undefined) {
    throw new BadRequestError(`There is no ${type} workflow with the model ${model}.`);
  }

  const Implementation = getImplementation(config);
  const workflow = new Implementation();
  const { visible, advanced } = getClientParamKeys(config, workflow);
  const clientKeys = new Set([...visible, ...advanced]);
  const forbiddenKeys = Object.keys(clientParams).filter((key) => !clientKeys.has(key));
  if (forbiddenKeys.length > 0) {
    throw new BadRequestError(`The ${type} workflow with the model ${model} does not accept the params: ${forbiddenKeys.join(', ')}.`);
  }

  return {
    workflow,
    workflowId: Implementation.id,
    params: { ...config.params.defaults, ...clientParams, ...config.serverParams }
  };
};
