import { Buffer } from 'node:buffer';
import type { Request } from 'express';
import { PayloadTooLargeError } from './errors/PayloadTooLargeError.js';

const toMegabytes = (bytes: number): string => (bytes / 1024 / 1024).toString();

/**
 * Reads the raw request body, giving up as soon as it grows past the limit instead of buffering the whole thing.
 */
export const readRawBody = async (req: Request, maxBytes: number): Promise<Uint8Array> => {
  const tooLargeError = new PayloadTooLargeError(`The file must be at most ${toMegabytes(maxBytes)} MB.`);

  // Rejected before reading anything when the client announces the size upfront, as browsers do for files.
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw tooLargeError;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > maxBytes) {
      // Leaving the loop destroys the request, which stops the client from sending the rest.
      throw tooLargeError;
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks, size);
};

/**
 * The content type of the request without parameters such as the charset, which are irrelevant for binary files.
 */
export const getMediaType = (req: Request): string => req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
