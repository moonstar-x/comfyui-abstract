import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { MAX_AUDIO_UPLOAD_MB, MAX_IMAGE_UPLOAD_MB } from '../../config/environment.js';
import { createComfyUiClient } from '../comfyui/client.js';
import { database } from '../database/client/postgres.js';
import type { UploadRow } from '../database/models/uploads.js';
import { createUpload } from '../database/repositories/uploads.js';

export const UPLOAD_KINDS = {
  AUDIO: 'audio',
  IMAGE: 'image'
} as const;
export type UploadKind = typeof UPLOAD_KINDS[keyof typeof UPLOAD_KINDS];

interface UploadKindConfig {
  // Content types accepted for this kind, mapped to the extension the file is stored with.
  extensions: Readonly<Record<string, string>>;
  maxBytes: number;
}

const MEGABYTE = 1024 * 1024;

export const UPLOAD_KIND_CONFIGS: Readonly<Record<UploadKind, UploadKindConfig>> = {
  audio: {
    maxBytes: MAX_AUDIO_UPLOAD_MB * MEGABYTE,
    extensions: {
      'audio/aac': 'aac',
      'audio/flac': 'flac',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/opus': 'opus',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/webm': 'webm',
      'audio/x-flac': 'flac',
      'audio/x-m4a': 'm4a',
      'audio/x-wav': 'wav'
    }
  },
  image: {
    maxBytes: MAX_IMAGE_UPLOAD_MB * MEGABYTE,
    extensions: {
      'image/bmp': 'bmp',
      'image/gif': 'gif',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    }
  }
};

/**
 * Subfolder of the ComfyUI input directory that uploads are stored in, kept apart from the files added through ComfyUI itself.
 */
const UPLOAD_SUBFOLDER = 'comfyui-abstract';

// Only used for its HTTP API, so it never opens a websocket.
const comfyui = createComfyUiClient();

export const isUploadKind = (value: unknown): value is UploadKind => typeof value === 'string' && Object.values<string>(UPLOAD_KINDS).includes(value);

export const getUploadExtension = (kind: UploadKind, contentType: string): string | undefined => UPLOAD_KIND_CONFIGS[kind].extensions[contentType];

export interface StoreUploadData {
  data: Uint8Array;
  extension: string;
  kind: UploadKind;
  mimeType: string;
  username: string;
}

/**
 * Stores the file in the ComfyUI input directory and returns the reference workflows load it with.
 */
const uploadToComfyUi = async (data: Uint8Array, filename: string): Promise<string> => {
  const result = await comfyui.uploadImage(data, filename, { subfolder: UPLOAD_SUBFOLDER });
  if (result === false) {
    throw new Error('Could not upload the file to ComfyUI.');
  }

  return `${result.info.subfolder}/${result.info.filename}`;
};

/**
 * Records the upload for the user and stores the file in ComfyUI under a random name, in a transaction so the row is only kept
 * if the file made it to ComfyUI. The row's comfy_filename is the reference workflows load the file with.
 */
export const storeUpload = async ({ username, kind, mimeType, extension, data }: StoreUploadData): Promise<UploadRow> => await database.tx(async (t) => {
  const filename = `${randomUUID()}.${extension}`;
  const upload = await createUpload({
    username,
    comfyFilename: `${UPLOAD_SUBFOLDER}/${filename}`,
    mediaType: kind,
    mimeType,
    sizeBytes: data.byteLength,
    originalFilename: null
  }, t);

  // ComfyUI renames files that already exist instead of overwriting them, which would leave the row pointing at another file.
  const reference = await uploadToComfyUi(data, filename);
  if (reference !== upload.comfy_filename) {
    throw new Error(`ComfyUI stored the file as ${reference} instead of ${upload.comfy_filename}.`);
  }

  return upload;
});

/**
 * Accepts only references stored by storeUpload for the given kind, so a client can't point a workflow at any other file.
 * The subfolder and extensions contain no regex special characters, so they need no escaping.
 */
export const makeUploadReferenceSchema = (kind: UploadKind): z.ZodString => {
  const extensions = [...new Set(Object.values(UPLOAD_KIND_CONFIGS[kind].extensions))].join('|');
  const pattern = new RegExp(String.raw`^${UPLOAD_SUBFOLDER}/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.(?:${extensions})$`, 'u');

  return z.string().regex(pattern, `Must be a reference to an ${kind} uploaded through /uploads/${kind}.`);
};
