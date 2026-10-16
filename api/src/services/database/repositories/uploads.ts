import type { Nullable } from '../../../utils/types.js';
import { database } from '../client/postgres.js';
import type { DatabaseConnection } from '../client/postgres.js';
import type { MediaType } from '../models/generations.js';
import type { UploadRow } from '../models/uploads.js';

export interface PublicUpload {
  comfyFilename: string;
  createdAt: Date;
  id: string;
  mediaType: MediaType;
  mimeType: string;
  originalFilename: Nullable<string>;
  sizeBytes: number;
  username: string;
}

export interface CreateUploadData {
  comfyFilename: string;
  mediaType: MediaType;
  mimeType: string;
  originalFilename: Nullable<string>;
  sizeBytes: number;
  username: string;
}

export interface FindUploadsFilter {
  limit: number;
  mediaType?: MediaType | undefined;
  offset: number;
  username: string;
}

export const toPublicUpload = (upload: UploadRow): PublicUpload => ({
  id: upload.id,
  username: upload.username,
  comfyFilename: upload.comfy_filename,
  mediaType: upload.media_type,
  mimeType: upload.mime_type,
  sizeBytes: Number(upload.size_bytes),
  originalFilename: upload.original_filename,
  createdAt: upload.created_at
});

export const createUpload = async (data: CreateUploadData, connection: DatabaseConnection = database): Promise<UploadRow> => {
  const query = `INSERT INTO user_uploads(username, comfy_filename, media_type, mime_type, size_bytes, original_filename)
    VALUES($1, $2, $3, $4, $5, $6)
    RETURNING *`;

  return await connection.one<UploadRow>(query, [
    data.username,
    data.comfyFilename,
    data.mediaType,
    data.mimeType,
    data.sizeBytes,
    data.originalFilename
  ]);
};

export const findUploadById = async (id: string): Promise<Nullable<UploadRow>> => {
  const query = 'SELECT * FROM user_uploads WHERE id = $1';
  return await database.oneOrNone<UploadRow>(query, [id]);
};

export const findUploadByComfyFilename = async (comfyFilename: string): Promise<Nullable<UploadRow>> => {
  const query = 'SELECT * FROM user_uploads WHERE comfy_filename = $1';
  return await database.oneOrNone<UploadRow>(query, [comfyFilename]);
};

/**
 * Returns a user's uploads matching the filter, newest first.
 */
export const findUploads = async ({ username, mediaType, limit, offset }: FindUploadsFilter): Promise<UploadRow[]> => {
  const query = `SELECT * FROM user_uploads
    WHERE username = $1 AND ($2::varchar IS NULL OR media_type = $2)
    ORDER BY created_at DESC, id DESC
    LIMIT $3 OFFSET $4`;

  return await database.manyOrNone<UploadRow>(query, [username, mediaType ?? null, limit, offset]);
};

export const countUploadsByUsername = async (username: string): Promise<number> => {
  const query = 'SELECT COUNT(*)::int AS count FROM user_uploads WHERE username = $1';
  const { count } = await database.one<{ count: number }>(query, [username]);
  return count;
};

/**
 * Deletes an upload only if it belongs to the given user. Returns the deleted upload so its file can be cleaned up,
 * or null if it does not exist or belongs to someone else.
 */
export const deleteUpload = async (id: string, username: string): Promise<Nullable<UploadRow>> => {
  const query = 'DELETE FROM user_uploads WHERE id = $1 AND username = $2 RETURNING *';
  return await database.oneOrNone<UploadRow>(query, [id, username]);
};

/**
 * Deletes the uploads of the given IDs that belong to the given user, skipping the rest. Returns the deleted uploads
 * so their files can be cleaned up.
 */
export const deleteUploads = async (ids: string[], username: string): Promise<UploadRow[]> => {
  const query = 'DELETE FROM user_uploads WHERE id = ANY($1::uuid[]) AND username = $2 RETURNING *';
  return await database.manyOrNone<UploadRow>(query, [ids, username]);
};
