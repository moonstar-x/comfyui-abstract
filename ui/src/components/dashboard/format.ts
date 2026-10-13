import { formatDuration } from '@core/generations/generations';

export const formatGenerationCount = (count: number): string => count === 1 ? '1 generation' : `${count.toLocaleString()} generations`;

/**
 * The share of a value in a total as a whole percentage, or "<1%" when it is too small to round up.
 */
export const formatShare = (value: number, total: number): string => {
  if (total === 0) {
    return '0%';
  }

  const percent = (value / total) * 100;
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent).toString()}%`;
};

/**
 * Like formatDuration, but keeps millisecond precision for durations under a second, which queue waits often are.
 */
export const formatStatDuration = (ms: number): string => ms < 1000 ? `${Math.round(Math.max(0, ms)).toString()}ms` : formatDuration(ms);
