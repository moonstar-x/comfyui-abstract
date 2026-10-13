import { Buffer } from 'node:buffer';
import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PostController } from '../../app/controller/PostController.js';
import { PayloadTooLargeError } from '../../app/http/errors/PayloadTooLargeError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { UnsupportedMediaTypeError } from '../../app/http/errors/UnsupportedMediaTypeError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import { getUploadExtension, isUploadKind, UPLOAD_KIND_CONFIGS, uploadToComfyUi } from '../../services/uploads/uploads.js';

const toMegabytes = (bytes: number): string => (bytes / 1024 / 1024).toString();

/**
 * Reads the raw request body, giving up as soon as it grows past the limit instead of buffering the whole thing.
 */
const readBody = async (req: Request, maxBytes: number): Promise<Uint8Array> => {
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
 * Uploads a single file, sent as the raw request body with its content type, to the ComfyUI input directory.
 * Responds with the reference that workflow params use to point at the file.
 */
export default class PostUploadController extends PostController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/uploads/:kind';

  public override async handle(req: Request): Promise<ResponseBuilder> {
    const { kind } = req.params;
    if (!isUploadKind(kind)) {
      throw new ResourceNotFoundError(`Uploads of kind ${String(kind)} are not supported.`);
    }

    // Parameters such as the charset are irrelevant for binary files.
    const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
    const extension = getUploadExtension(kind, contentType);
    if (extension === undefined) {
      const accepted = Object.keys(UPLOAD_KIND_CONFIGS[kind].extensions).join(', ');
      throw new UnsupportedMediaTypeError(`Content type ${contentType === '' ? '(none)' : contentType} is not a supported ${kind}. Supported types: ${accepted}.`);
    }

    const data = await readBody(req, UPLOAD_KIND_CONFIGS[kind].maxBytes);
    const reference = await uploadToComfyUi(data, extension);

    return new ResponseBuilder().withStatus(StatusCodes.CREATED).withData({ reference });
  }
}
