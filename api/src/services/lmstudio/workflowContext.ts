import { BadRequestError } from '../../app/http/errors/BadRequestError.js';
import type { Nullable } from '../../utils/types.js';
import { getWorkflowDefinition } from '../../workflows/factory.js';
import type { WorkflowFieldDefinition, WorkflowModelDefinition } from '../../workflows/factory.js';
import { WORKFLOW_TYPES } from '../../workflows/types.js';
import type { WorkflowType } from '../../workflows/types.js';
import type { ConversationWorkflowContext } from '../database/repositories/conversations.js';

const WORKFLOW_TYPE_VALUES: readonly string[] = Object.values(WORKFLOW_TYPES);
const isWorkflowType = (value: string): value is WorkflowType => WORKFLOW_TYPE_VALUES.includes(value);

/**
 * The model of the workflow in the current config, or null when the config no longer has it.
 */
const findModelDefinition = ({ type, model }: ConversationWorkflowContext): Nullable<WorkflowModelDefinition> => isWorkflowType(type)
  ? getWorkflowDefinition(type).models.find((candidate) => candidate.alias === model) ?? null
  : null;

/**
 * Throws when the workflow context names a workflow or model the config does not have, so a conversation is never started with a context
 * that cannot be described.
 */
export const assertWorkflowContextExists = (context: ConversationWorkflowContext): void => {
  if (findModelDefinition(context) === null) {
    throw new BadRequestError(`There is no ${context.type} workflow with the model ${context.model}.`);
  }
};

const describeFieldDetails = (field: WorkflowFieldDefinition): string[] => {
  switch (field.kind) {
    case 'audio':
      return ['an uploaded audio file'];

    case 'boolean':
    case 'text':
      return [field.kind];

    case 'image-list':
      return [`up to ${field.maxImages.toString()} uploaded images`];

    case 'lora-list':
      return [`LoRAs with a strength from ${field.minStrength.toString()} to ${field.maxStrength.toString()}`];

    case 'number':
      return [
        field.integer === true ? 'integer' : 'number',
        ...field.min === undefined ? [] : [`min ${field.min.toString()}`],
        ...field.max === undefined ? [] : [`max ${field.max.toString()}`]
      ];

    case 'select':
      return [`one of ${field.options.join(', ')}`];
  }
};

const describeField = (field: WorkflowFieldDefinition): string => {
  const details = [
    ...describeFieldDetails(field),
    ...field.required === true ? ['required'] : [],
    ...field.isAdvanced ? ['advanced setting'] : []
  ];
  const description = field.description === undefined ? '' : ` ${field.description}`;
  const defaultValue = field.defaultValue === undefined ? '' : ` Default: ${JSON.stringify(field.defaultValue)}.`;
  return `- ${field.label} (${details.join(', ')}).${description}${defaultValue}`;
};

const describeLoras = (definition: WorkflowModelDefinition): string[] => {
  const loras = definition.fields.flatMap((field) => field.kind === 'lora-list' ? field.options : []);
  return [...new Set(loras)].map((lora) => {
    const instructions = definition.documentation.loras[lora];
    return instructions === undefined ? `### ${lora}\n\nNo instructions.` : `### ${lora}\n\n${instructions.trim()}`;
  });
};

/**
 * The system prompt that tells the model about the workflow page a conversation was started from: every instruction of the model, those of every
 * LoRA it allows, and the settings of its form. Read from the current config, so it follows changes to the config and the model instructions.
 * Null when the config no longer has the workflow, in which case the conversation goes on without it.
 */
export const buildWorkflowSystemPrompt = (context: ConversationWorkflowContext): Nullable<string> => {
  const definition = findModelDefinition(context);
  if (definition === null) {
    return null;
  }

  const loras = describeLoras(definition);
  const sections = [
    [
      'You are the assistant of an app that runs ComfyUI workflows.',
      `The user opened this chat from the page of the ${context.type} workflow, with the model ${context.model} selected.`,
      'Use the information below to answer their questions about this workflow and model and to guide them, such as by writing prompts or suggesting settings.',
      'When the information does not cover something, say so instead of guessing.'
    ].join(' '),
    `## Instructions of the model ${context.model}\n\n${definition.documentation.model?.trim() ?? 'No instructions.'}`,
    ...loras.length > 0 ? [`## LoRAs that can be picked\n\n${loras.join('\n\n')}`] : [],
    `## Settings of the form\n\n${definition.fields.map((field) => describeField(field)).join('\n')}`
  ];

  return sections.join('\n\n');
};
