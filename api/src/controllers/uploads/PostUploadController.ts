import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PostController } from '../../app/controller/PostController.js';
import { getMediaType, readRawBody } from '../../app/http/body.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { UnsupportedMediaTypeError } from '../../app/http/errors/UnsupportedMediaTypeError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import { getUploadExtension, isUploadKind, UPLOAD_KIND_CONFIGS, uploadToComfyUi } from '../../services/uploads/uploads.js';

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

    const contentType = getMediaType(req);
    const extension = getUploadExtension(kind, contentType);
    if (extension === undefined) {
      const accepted = Object.keys(UPLOAD_KIND_CONFIGS[kind].extensions).join(', ');
      throw new UnsupportedMediaTypeError(`Content type ${contentType === '' ? '(none)' : contentType} is not a supported ${kind}. Supported types: ${accepted}.`);
    }

    const data = await readRawBody(req, UPLOAD_KIND_CONFIGS[kind].maxBytes);
    const reference = await uploadToComfyUi(data, extension);

    return new ResponseBuilder().withStatus(StatusCodes.CREATED).withData({ reference });
  }
}
