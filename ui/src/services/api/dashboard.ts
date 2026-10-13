import type { Nullable } from '@core/utils/types';
import { apiRequest } from '@services/api/client';

export type MediaType = 'audio' | 'image';

interface PeriodCounts {
  thisMonth: number;
  thisWeek: number;
  today: number;
}

/**
 * Generations of every user since the start of the current day, week and month, and of all time.
 * Periods start at midnight UTC, weeks on Monday.
 */
export interface GenerationPeriodCounts extends PeriodCounts {
  allTime: number;
  /**
   * The previous day, week and month, counted up to the same point in time as now.
   */
  previous: PeriodCounts;
}

export interface GenerationUserSummary {
  generationCount: number;
  lastGeneratedAt: string;
  pictureUrl: Nullable<string>;
  username: string;
}

export interface GenerationWorkflowCount {
  generationCount: number;
  mediaType: MediaType;
  workflowType: string;
}

export interface GenerationModelCount {
  generationCount: number;
  mediaType: MediaType;
  model: string;
}

export interface GenerationDailyCount {
  /**
   * The day formatted as YYYY-MM-DD.
   */
  day: string;
  generationCount: number;
}

/**
 * Milliseconds.
 */
export interface DurationStats {
  avg: number;
  max: number;
  median: number;
  min: number;
  p95: number;
}

export interface GenerationTimingStats {
  queueWait: Nullable<DurationStats>;
  render: Nullable<DurationStats>;
  sampleCount: number;
}

export interface Dashboard {
  /**
   * Generations per day over the last 30 days, oldest first.
   */
  dailyActivity: GenerationDailyCount[];
  generations: GenerationPeriodCounts;
  /**
   * Users with the most generations, most generations first.
   */
  mostActiveUsers: GenerationUserSummary[];
  timing: GenerationTimingStats;
  /**
   * Most used models, most generations first.
   */
  topModels: GenerationModelCount[];
  users: { count: number };
  /**
   * Generations per workflow, most used first.
   */
  workflows: GenerationWorkflowCount[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isMediaType = (value: unknown): value is MediaType => value === 'image' || value === 'audio';

const isPeriodCounts = (value: unknown): value is PeriodCounts => isRecord(value) &&
  typeof value['today'] === 'number' &&
  typeof value['thisWeek'] === 'number' &&
  typeof value['thisMonth'] === 'number';

// The period counts are checked last, since narrowing to them first would hide the other properties.
const isGenerationPeriodCounts = (value: unknown): value is GenerationPeriodCounts => isRecord(value) &&
  typeof value['allTime'] === 'number' &&
  isPeriodCounts(value['previous']) &&
  isPeriodCounts(value);

const isGenerationUserSummary = (value: unknown): value is GenerationUserSummary => isRecord(value) &&
  typeof value['username'] === 'string' &&
  typeof value['generationCount'] === 'number' &&
  typeof value['lastGeneratedAt'] === 'string' &&
  (value['pictureUrl'] === null || typeof value['pictureUrl'] === 'string');

const isGenerationWorkflowCount = (value: unknown): value is GenerationWorkflowCount => isRecord(value) &&
  typeof value['workflowType'] === 'string' &&
  isMediaType(value['mediaType']) &&
  typeof value['generationCount'] === 'number';

const isGenerationModelCount = (value: unknown): value is GenerationModelCount => isRecord(value) &&
  typeof value['model'] === 'string' &&
  isMediaType(value['mediaType']) &&
  typeof value['generationCount'] === 'number';

const isGenerationDailyCount = (value: unknown): value is GenerationDailyCount => isRecord(value) &&
  typeof value['day'] === 'string' &&
  typeof value['generationCount'] === 'number';

const isDurationStats = (value: unknown): value is DurationStats => isRecord(value) &&
  typeof value['min'] === 'number' &&
  typeof value['max'] === 'number' &&
  typeof value['avg'] === 'number' &&
  typeof value['median'] === 'number' &&
  typeof value['p95'] === 'number';

const isGenerationTimingStats = (value: unknown): value is GenerationTimingStats => isRecord(value) &&
  typeof value['sampleCount'] === 'number' &&
  (value['queueWait'] === null || isDurationStats(value['queueWait'])) &&
  (value['render'] === null || isDurationStats(value['render']));

const isArrayOf = <T>(value: unknown, isItem: (item: unknown) => item is T): value is T[] => Array.isArray(value) && value.every((item) => isItem(item));

const isDashboard = (value: unknown): value is Dashboard => isRecord(value) &&
  isRecord(value['users']) &&
  typeof value['users']['count'] === 'number' &&
  isGenerationPeriodCounts(value['generations']) &&
  isArrayOf(value['mostActiveUsers'], isGenerationUserSummary) &&
  isArrayOf(value['workflows'], isGenerationWorkflowCount) &&
  isArrayOf(value['topModels'], isGenerationModelCount) &&
  isArrayOf(value['dailyActivity'], isGenerationDailyCount) &&
  isGenerationTimingStats(value['timing']);

export const fetchDashboard = async (): Promise<Dashboard> => {
  const data = await apiRequest('/dashboard', { isAuthenticated: true });
  if (!isDashboard(data)) {
    throw new Error('The server returned an invalid dashboard.');
  }

  return data;
};
