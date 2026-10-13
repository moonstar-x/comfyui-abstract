import type { Nullable } from '@core/utils/types';
import { apiRequest } from '@services/api/client';

/**
 * Generations of every user since the start of the current day, week and month, and of all time.
 * Periods start at midnight UTC, weeks on Monday.
 */
export interface GenerationPeriodCounts {
  allTime: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

export interface GenerationUserSummary {
  generationCount: number;
  lastGeneratedAt: string;
  pictureUrl: Nullable<string>;
  username: string;
}

export interface Dashboard {
  generations: GenerationPeriodCounts;
  /**
   * Users with the most generations, most generations first.
   */
  mostActiveUsers: GenerationUserSummary[];
  users: { count: number };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isGenerationPeriodCounts = (value: unknown): value is GenerationPeriodCounts => isRecord(value) &&
  typeof value['today'] === 'number' &&
  typeof value['thisWeek'] === 'number' &&
  typeof value['thisMonth'] === 'number' &&
  typeof value['allTime'] === 'number';

const isGenerationUserSummary = (value: unknown): value is GenerationUserSummary => isRecord(value) &&
  typeof value['username'] === 'string' &&
  typeof value['generationCount'] === 'number' &&
  typeof value['lastGeneratedAt'] === 'string' &&
  (value['pictureUrl'] === null || typeof value['pictureUrl'] === 'string');

const isDashboard = (value: unknown): value is Dashboard => isRecord(value) &&
  isRecord(value['users']) &&
  typeof value['users']['count'] === 'number' &&
  isGenerationPeriodCounts(value['generations']) &&
  Array.isArray(value['mostActiveUsers']) &&
  value['mostActiveUsers'].every((summary) => isGenerationUserSummary(summary));

export const fetchDashboard = async (): Promise<Dashboard> => {
  const data = await apiRequest('/dashboard', { isAuthenticated: true });
  if (!isDashboard(data)) {
    throw new Error('The server returned an invalid dashboard.');
  }

  return data;
};
