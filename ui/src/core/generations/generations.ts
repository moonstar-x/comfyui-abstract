import type { Nullable } from '@core/utils/types';
import type { WorkflowLora } from '@core/workflows/definitions';
import { AudioLines, Image } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Keep in sync with the media_types table of the API.
export const MEDIA_TYPES = ['image', 'audio'] as const;
export type MediaType = typeof MEDIA_TYPES[number];

export interface MediaTypeOption {
  icon: LucideIcon;
  label: string;
  value: MediaType;
}

export const MEDIA_TYPE_OPTIONS: readonly MediaTypeOption[] = [
  { icon: Image, label: 'Images', value: 'image' },
  { icon: AudioLines, label: 'Audio', value: 'audio' }
];

const MEDIA_TYPE_VALUES: readonly string[] = MEDIA_TYPES;

export const isMediaType = (value: unknown): value is MediaType => typeof value === 'string' && MEDIA_TYPE_VALUES.includes(value);

/**
 * A finished generation stored by the API.
 */
export interface GenerationRecord {
  completedAt: string;
  createdAt: string;
  /**
   * Milliseconds from the moment the generation was queued until it completed.
   */
  durationMs: number;
  id: string;
  mediaType: MediaType;
  model: string;
  outputs: string[];
  params: Record<string, unknown>;
  promptId: string;
  startedAt: Nullable<string>;
  username: string;
  workflowId: string;
  workflowType: string;
}

const hasGenerationIdentity = (value: object): boolean => 'id' in value &&
  typeof value.id === 'string' &&
  'username' in value &&
  typeof value.username === 'string' &&
  'mediaType' in value &&
  isMediaType(value.mediaType);

const hasGenerationContent = (value: object): boolean => 'outputs' in value &&
  Array.isArray(value.outputs) &&
  'params' in value &&
  typeof value.params === 'object' &&
  value.params !== null &&
  'createdAt' in value &&
  typeof value.createdAt === 'string' &&
  'durationMs' in value &&
  typeof value.durationMs === 'number';

export const isGenerationRecord = (value: unknown): value is GenerationRecord => typeof value === 'object' &&
  value !== null &&
  hasGenerationIdentity(value) &&
  hasGenerationContent(value);

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export const formatDateTime = (iso: string): string => dateTimeFormat.format(new Date(iso));

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const RELATIVE_TIME_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [['day', 86_400], ['hour', 3600], ['minute', 60]];

/**
 * Renders how long ago something happened, falling back to the date once it is over a week old.
 */
export const formatRelativeTime = (iso: string): string => {
  const date = new Date(iso);
  const elapsedSeconds = (Date.now() - date.getTime()) / 1000;
  if (elapsedSeconds >= 7 * 86_400) {
    return shortDateFormat.format(date);
  }

  for (const [unit, seconds] of RELATIVE_TIME_UNITS) {
    if (elapsedSeconds >= seconds) {
      return relativeTimeFormat.format(-Math.floor(elapsedSeconds / seconds), unit);
    }
  }

  return 'just now';
};

export const formatTime = (iso: string): string => timeFormat.format(new Date(iso));

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, ms) / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const seconds = Math.round(totalSeconds) % 60;
  const minutes = Math.floor(Math.round(totalSeconds) / 60) % 60;
  const hours = Math.floor(Math.round(totalSeconds) / 3600);
  const rest = `${minutes.toString()}m ${seconds.toString()}s`;

  return hours > 0 ? `${hours.toString()}h ${rest}` : rest;
};

const getLocalDayKey = (date: Date): string => `${date.getFullYear().toString()}-${date.getMonth().toString()}-${date.getDate().toString()}`;

const formatDayLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (getLocalDayKey(date) === getLocalDayKey(today)) {
    return 'Today';
  }

  if (getLocalDayKey(date) === getLocalDayKey(yesterday)) {
    return 'Yesterday';
  }

  return dayFormat.format(date);
};

export interface GenerationDay {
  generations: GenerationRecord[];
  key: string;
  label: string;
}

/**
 * Groups generations by the local day they were made on, keeping their order. Expects them sorted newest first.
 */
export const groupGenerationsByDay = (generations: readonly GenerationRecord[]): GenerationDay[] => {
  const days: GenerationDay[] = [];

  for (const generation of generations) {
    const date = new Date(generation.createdAt);
    const key = getLocalDayKey(date);
    const last = days.at(-1);
    if (last?.key === key) {
      last.generations.push(generation);
    } else {
      days.push({ generations: [generation], key, label: formatDayLabel(date) });
    }
  }

  return days;
};

const isWorkflowLora = (value: unknown): value is WorkflowLora => typeof value === 'object' &&
  value !== null &&
  'lora' in value &&
  typeof value.lora === 'string' &&
  'strength' in value &&
  typeof value.strength === 'number';

/**
 * Tells whether a param is the value of a LoRA list field, which is shown as a badge per LoRA rather than as a single value.
 */
export const isWorkflowLoraList = (value: unknown): value is WorkflowLora[] => Array.isArray(value) && value.every((item) => isWorkflowLora(item));

/**
 * Renders a LoRA of a generation as its name followed by its strength, such as "detail-tweaker:0.8".
 */
export const formatLora = ({ lora, strength }: WorkflowLora): string => `${lora}:${strength.toString()}`;

/**
 * Renders a workflow param for display, keeping strings as they are and serializing everything else.
 */
export const formatParamValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }

  return JSON.stringify(value);
};

// The prompt that leads a feed post, in order of preference. Keep in sync with the workflow fields of the API.
const MAIN_PROMPT_KEYS: readonly string[] = ['positivePrompt', 'prompt', 'captionPrompt', 'stylePrompt'];

const isPromptParam = (key: string): boolean => key.toLowerCase().includes('prompt');

// Upload references that mean nothing as a badge, by workflow type. Keep in sync with the workflow fields of the API.
const HIDDEN_PARAM_KEYS: Readonly<Record<string, readonly string[]>> = {
  'music-cover': ['song'],
  'image-edit': ['images'],
  'image-upscale': ['images']
};

const isHiddenParam = (workflowType: string, key: string): boolean => HIDDEN_PARAM_KEYS[workflowType]?.includes(key) ?? false;

const isEmptyParam = (value: unknown): boolean => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

const getPromptRank = (key: string): number => {
  const rank = MAIN_PROMPT_KEYS.indexOf(key);
  return rank === -1 ? MAIN_PROMPT_KEYS.length : rank;
};

export interface GenerationPrompt {
  key: string;
  text: string;
}

export interface GenerationPostParams {
  /**
   * Every prompt param, with the main prompt first.
   */
  prompts: GenerationPrompt[];
  settings: Array<[string, unknown]>;
}

/**
 * Splits the params of a generation into the prompts that describe a feed post and the settings shown as badges, leaving out empty and hidden ones.
 */
export const splitGenerationParams = (workflowType: string, params: Record<string, unknown>): GenerationPostParams => {
  const prompts: GenerationPrompt[] = [];
  const settings: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(params)) {
    if (isEmptyParam(value) || isHiddenParam(workflowType, key)) {
      continue;
    }

    if (isPromptParam(key)) {
      prompts.push({ key, text: formatParamValue(value).trim() });
    } else {
      settings.push([key, value]);
    }
  }

  prompts.sort((a, b) => getPromptRank(a.key) - getPromptRank(b.key));
  return { prompts, settings };
};

/**
 * Turns a param key into a label, such as "negativePrompt" into "Negative prompt".
 */
export const formatParamLabel = (key: string): string => {
  const words = key.replaceAll(/(?<=[\da-z])(?=[A-Z])/gu, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
