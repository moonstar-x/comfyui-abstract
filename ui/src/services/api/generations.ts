import { isGenerationRecord } from '@core/generations/generations';
import type { GenerationRecord, MediaType } from '@core/generations/generations';
import { apiRequest, apiRequestWithMeta } from '@services/api/client';

// Keep in sync with the reserved usernames of the API.
export const CURRENT_USER = 'me';

export interface GenerationsFilter {
  mediaType?: MediaType | undefined;
  /**
   * Only the generations of this user when given, otherwise the generations of every user.
   */
  username?: string | undefined;
}

export interface GenerationsPage {
  generations: GenerationRecord[];
  hasMore: boolean;
  offset: number;
}

const isGenerationRecordList = (value: unknown): value is GenerationRecord[] => Array.isArray(value) && value.every((item) => isGenerationRecord(item));

const buildQuery = (params: Record<string, number | string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value.toString());
    }
  }

  const query = search.toString();
  return query === '' ? '' : `?${query}`;
};

export const fetchGenerations = async ({ username, mediaType }: GenerationsFilter, offset: number, limit: number): Promise<GenerationsPage> => {
  const path = username === undefined ? '/generations' : `/users/${encodeURIComponent(username)}/generations`;
  const { data, meta } = await apiRequestWithMeta(`${path}${buildQuery({ mediaType, limit, offset })}`, { isAuthenticated: true });
  if (!isGenerationRecordList(data)) {
    throw new Error('The server returned an invalid generation history.');
  }

  return { generations: data, hasMore: meta['hasMore'] === true, offset };
};

export const deleteGeneration = async (id: string): Promise<void> => {
  await apiRequest(`/generations/${encodeURIComponent(id)}`, { method: 'DELETE', isAuthenticated: true });
};
