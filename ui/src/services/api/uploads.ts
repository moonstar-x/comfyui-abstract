import { isMediaType } from '@core/generations/generations';
import type { MediaType } from '@core/generations/generations';
import { chunk } from '@core/utils/arrays';
import { apiRequest, apiRequestFile, apiRequestWithMeta } from '@services/api/client';
import { CURRENT_USER } from '@services/api/generations';

export type UploadKind = 'audio' | 'image';

// Keyed by the selected file, so running a workflow again with the same files doesn't upload them again.
const uploads = new WeakMap<File, Promise<string>>();

const isUploadResponse = (value: unknown): value is { reference: string } => typeof value === 'object' &&
  value !== null &&
  'reference' in value &&
  typeof value.reference === 'string';

const requestUpload = async (kind: UploadKind, file: File): Promise<string> => {
  const data = await apiRequest(`/uploads/${kind}`, { method: 'POST', file, isAuthenticated: true });
  if (!isUploadResponse(data)) {
    throw new Error(`The server returned an unexpected response when uploading ${file.name}.`);
  }

  return data.reference;
};

/**
 * Uploads the file to the API and returns the reference that workflow params use to point at it.
 */
export const uploadFile = async (kind: UploadKind, file: File): Promise<string> => {
  const cached = uploads.get(file);
  if (cached !== undefined) {
    return await cached;
  }

  const upload = requestUpload(kind, file);
  uploads.set(file, upload);
  try {
    return await upload;
  } catch (error) {
    // A failed upload is retried the next time the workflow runs.
    uploads.delete(file);
    throw error;
  }
};

/**
 * A file the current user uploaded to use in workflows.
 */
export interface UploadRecord {
  // The reference that workflow params use to point at the file.
  comfyFilename: string;
  createdAt: string;
  id: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadsFilter {
  mediaType?: MediaType | undefined;
}

export interface UploadsPage {
  hasMore: boolean;
  offset: number;
  uploads: UploadRecord[];
}

const isUploadRecord = (value: unknown): value is UploadRecord => typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'comfyFilename' in value &&
  typeof value.comfyFilename === 'string' &&
  'mediaType' in value &&
  isMediaType(value.mediaType) &&
  'mimeType' in value &&
  typeof value.mimeType === 'string' &&
  'sizeBytes' in value &&
  typeof value.sizeBytes === 'number' &&
  'createdAt' in value &&
  typeof value.createdAt === 'string';

const isUploadRecordList = (value: unknown): value is UploadRecord[] => Array.isArray(value) && value.every((item) => isUploadRecord(item));

/**
 * Returns a page of the current user's uploads, newest first.
 */
export const fetchUploads = async ({ mediaType }: UploadsFilter, offset: number, limit: number): Promise<UploadsPage> => {
  const search = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  if (mediaType !== undefined) {
    search.set('mediaType', mediaType);
  }

  const { data, meta } = await apiRequestWithMeta(`/users/${CURRENT_USER}/uploads?${search.toString()}`, { isAuthenticated: true });
  if (!isUploadRecordList(data)) {
    throw new Error('The server returned an invalid list of uploads.');
  }

  return { hasMore: meta['hasMore'] === true, offset, uploads: data };
};

/**
 * Downloads the file of an upload. It can't be linked to directly since the API only serves it to its authenticated owner.
 */
export const fetchUploadFile = async (id: string): Promise<Blob> => await apiRequestFile(`/uploads/${encodeURIComponent(id)}/file`, { isAuthenticated: true });

/**
 * Deletes an upload of the current user along with its file.
 */
export const deleteUpload = async (id: string): Promise<void> => {
  await apiRequest(`/uploads/${encodeURIComponent(id)}`, { method: 'DELETE', isAuthenticated: true });
};

// Keep in sync with MAX_BULK_DELETE_UPLOADS of the API.
const MAX_BULK_DELETE_UPLOADS = 100;

/**
 * Deletes several uploads of the current user along with their files, in as few requests as the API allows.
 */
export const deleteUploads = async (ids: readonly string[]): Promise<void> => {
  for (const batch of chunk(ids, MAX_BULK_DELETE_UPLOADS)) {
    // Sent one after another so a large selection doesn't flood the API, and ComfyUI with file deletions.
    // eslint-disable-next-line no-await-in-loop
    await apiRequest('/uploads', { method: 'DELETE', body: { ids: batch }, isAuthenticated: true });
  }
};
