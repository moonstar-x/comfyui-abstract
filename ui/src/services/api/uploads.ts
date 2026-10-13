import { apiRequest } from '@services/api/client';

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
