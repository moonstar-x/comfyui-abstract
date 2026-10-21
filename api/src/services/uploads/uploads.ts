import { randomUUID } from 'node:crypto';
import { logger } from '@moonstar-x/logger';
import type { ComfyApi } from '@saintno/comfyui-sdk';
import { z } from 'zod';
import { COMFYUI_UPLOAD_SUBFOLDER, MAX_AUDIO_UPLOAD_MB, MAX_IMAGE_UPLOAD_MB } from '../../config/environment.js';
import { connectComfyUiClient, createComfyUiClient } from '../comfyui/client.js';
import { deleteInputFile } from '../comfyui/utility/delete-input-file/workflow.js';
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

// Holds the files that workflows reuse without them being one of the user's uploads, such as generated images.
const COMFYUI_TEMP_SUBFOLDER = `${COMFYUI_UPLOAD_SUBFOLDER}/temp`;

// Deleting a file takes ComfyUI no time, so this only stops a request from hanging when it can't be reached or the workflow never finishes.
const DELETE_UPLOAD_FILE_TIMEOUT_MS = 30_000;

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
 * Stores the file in a subfolder of the ComfyUI input directory and returns the reference workflows load it with.
 * Unless overwriting, ComfyUI renames the file instead when one with the same name already exists.
 */
const uploadToComfyUi = async (data: Uint8Array, filename: string, subfolder: string, shouldOverwrite = false): Promise<string> => {
  const result = await comfyui.uploadImage(data, filename, { subfolder, override: shouldOverwrite });
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
    comfyFilename: `${COMFYUI_UPLOAD_SUBFOLDER}/${filename}`,
    mediaType: kind,
    mimeType,
    sizeBytes: data.byteLength,
    originalFilename: null
  }, t);

  // ComfyUI renames files that already exist instead of overwriting them, which would leave the row pointing at another file.
  const reference = await uploadToComfyUi(data, filename, COMFYUI_UPLOAD_SUBFOLDER);
  if (reference !== upload.comfy_filename) {
    throw new Error(`ComfyUI stored the file as ${reference} instead of ${upload.comfy_filename}.`);
  }

  return upload;
});

/**
 * Stores an output file of a generation in the temp subfolder of the ComfyUI input directory so workflows can load it,
 * without recording it as an upload of the user. The file is named after the generation and output, and overwritten when
 * stored again, so reusing the same output doesn't pile up copies of it. Returns the reference workflows load it with.
 */
export const storeGenerationOutputInput = async (generationId: string, outputIndex: number, extension: string, data: Uint8Array): Promise<string> => {
  const filename = `${generationId}-${(outputIndex + 1).toString()}.${extension}`;
  const reference = await uploadToComfyUi(data, filename, COMFYUI_TEMP_SUBFOLDER, true);
  if (reference !== `${COMFYUI_TEMP_SUBFOLDER}/${filename}`) {
    throw new Error(`ComfyUI stored the file as ${reference} instead of ${COMFYUI_TEMP_SUBFOLDER}/${filename}.`);
  }

  return reference;
};

/**
 * Downloads the file of an upload from the ComfyUI input directory.
 */
export const readUploadFile = async (upload: UploadRow): Promise<Uint8Array> => {
  const separator = upload.comfy_filename.lastIndexOf('/');
  const query = new URLSearchParams({
    filename: upload.comfy_filename.slice(separator + 1),
    subfolder: upload.comfy_filename.slice(0, Math.max(0, separator)),
    type: 'input'
  });

  const response = await comfyui.fetchApi(`/view?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Could not download upload ${upload.id} from ComfyUI (HTTP ${response.status.toString()}).`);
  }

  return new Uint8Array(await response.arrayBuffer());
};

/**
 * Deletes the files of uploads from the ComfyUI input directory. ComfyUI has no endpoint for it, so it runs a workflow per file,
 * which requires a client with a websocket instead of the HTTP-only one used for the rest of the uploads. A single client is shared
 * by every file. The uploads are already gone from the user's uploads, so files that could not be deleted are only logged.
 */
export const deleteUploadFiles = async (uploads: UploadRow[]): Promise<void> => {
  if (uploads.length === 0) {
    return;
  }

  let client: ComfyApi;
  try {
    client = await connectComfyUiClient();
  } catch (error) {
    logger.error(`Could not connect to ComfyUI to delete the files of ${uploads.length.toString()} upload(s).`, error);
    return;
  }

  const timeout = Promise.withResolvers<never>();
  const timer = setTimeout(() => {
    timeout.reject(new Error('Deleting the files of the uploads timed out.'));
  }, DELETE_UPLOAD_FILE_TIMEOUT_MS);

  try {
    const results = await Promise.allSettled(uploads.map(async (upload) => {
      await Promise.race([deleteInputFile(client, upload.comfy_filename), timeout.promise]);
    }));

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        logger.error(`Could not delete the file of upload ${uploads[index]?.id ?? ''}.`, result.reason);
      }
    }
  } finally {
    clearTimeout(timer);
    client.destroy();
  }
};

const UUID_PATTERN = String.raw`[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}`;

/**
 * Accepts only references stored by storeUpload, or by storeGenerationOutputInput, for the given kind, so a client can't point a workflow at any other file.
 * The subfolder (validated when read from the environment) and extensions contain no regex special characters, so they need no escaping.
 */
export const makeUploadReferenceSchema = (kind: UploadKind): z.ZodString => {
  const extensions = [...new Set(Object.values(UPLOAD_KIND_CONFIGS[kind].extensions))].join('|');
  const pattern = new RegExp(String.raw`^(?:${COMFYUI_UPLOAD_SUBFOLDER}/${UUID_PATTERN}|${COMFYUI_TEMP_SUBFOLDER}/${UUID_PATTERN}-[1-9]\d*)\.(?:${extensions})$`, 'u');

  return z.string().regex(pattern, `Must be a reference to an ${kind} uploaded through /uploads/${kind} or an output stored through /generations/:id/outputs/:index/input.`);
};
