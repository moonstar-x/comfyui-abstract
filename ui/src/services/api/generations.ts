import { isGenerationRecord } from '@core/generations/generations';
import type { GenerationRecord, MediaType } from '@core/generations/generations';
import { chunk } from '@core/utils/arrays';
import { apiRequest, apiRequestWithMeta } from '@services/api/client';
import type { WorkflowType } from '@services/websocket/messages/client';

// Keep in sync with the reserved usernames of the API.
export const CURRENT_USER = 'me';

export interface GenerationsFilter {
  mediaType?: MediaType | undefined;
  /**
   * The alias of the model the generations were made with.
   */
  model?: string | undefined;
  /**
   * Only the generations of this user when given, otherwise the generations of every user.
   */
  username?: string | undefined;
  workflowType?: undefined | WorkflowType;
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

export const fetchGenerations = async ({ username, mediaType, workflowType, model }: GenerationsFilter, offset: number, limit: number): Promise<GenerationsPage> => {
  const path = username === undefined ? '/generations' : `/users/${encodeURIComponent(username)}/generations`;
  const { data, meta } = await apiRequestWithMeta(`${path}${buildQuery({ mediaType, workflowType, model, limit, offset })}`, { isAuthenticated: true });
  if (!isGenerationRecordList(data)) {
    throw new Error('The server returned an invalid generation history.');
  }

  return { generations: data, hasMore: meta['hasMore'] === true, offset };
};

export const deleteGeneration = async (id: string): Promise<void> => {
  await apiRequest(`/generations/${encodeURIComponent(id)}`, { method: 'DELETE', isAuthenticated: true });
};

// Keep in sync with MAX_BULK_DELETE_GENERATIONS of the API.
const MAX_BULK_DELETE_GENERATIONS = 100;

/**
 * Deletes several generations of the current user, in as few requests as the API allows.
 */
export const deleteGenerations = async (ids: readonly string[]): Promise<void> => {
  for (const batch of chunk(ids, MAX_BULK_DELETE_GENERATIONS)) {
    // Sent one after another so a large selection doesn't flood the API, and ComfyUI with file deletions.
    // eslint-disable-next-line no-await-in-loop
    await apiRequest('/generations', { method: 'DELETE', body: { ids: batch }, isAuthenticated: true });
  }
};

/**
 * Returns how many generations the current user has made.
 */
export const fetchGenerationCount = async (): Promise<number> => {
  const data = await apiRequest(`/users/${CURRENT_USER}/generations/count`, { isAuthenticated: true });
  if (typeof data !== 'object' || data === null || !('count' in data) || typeof data.count !== 'number') {
    throw new Error('The server returned an invalid generation count.');
  }

  return data.count;
};

// Keyed by generation and output, so picking the same output again doesn't store it again.
const outputInputs = new Map<string, Promise<string>>();

const isInputResponse = (value: unknown): value is { reference: string } => typeof value === 'object' &&
  value !== null &&
  'reference' in value &&
  typeof value.reference === 'string';

const requestOutputInput = async (id: string, index: number): Promise<string> => {
  const data = await apiRequest(`/generations/${encodeURIComponent(id)}/outputs/${index.toString()}/input`, { method: 'POST', isAuthenticated: true });
  if (!isInputResponse(data)) {
    throw new Error('The server returned an unexpected response when reusing the generated file.');
  }

  return data.reference;
};

/**
 * Stores an output file of a generation as a workflow input and returns the reference that workflow params use to point at it.
 * Unlike an upload, it isn't added to the current user's uploads.
 */
export const storeGenerationOutputInput = async (id: string, index: number): Promise<string> => {
  const key = `${id}/${index.toString()}`;
  const cached = outputInputs.get(key);
  if (cached !== undefined) {
    return await cached;
  }

  const request = requestOutputInput(id, index);
  outputInputs.set(key, request);
  try {
    return await request;
  } catch (error) {
    // A failed request is retried the next time the output is picked.
    outputInputs.delete(key);
    throw error;
  }
};
