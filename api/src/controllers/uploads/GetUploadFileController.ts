import type { Request, RequestHandler } from 'express';
import { GetController } from '../../app/controller/GetController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { findUploadById } from '../../services/database/repositories/uploads.js';
import { UploadIdSchema } from '../../services/uploads/schemas.js';
import { readUploadFile } from '../../services/uploads/uploads.js';

/**
 * The file of an upload of the current user. Uploads live in the ComfyUI input directory, so the file is proxied from ComfyUI.
 */
export default class GetUploadFileController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/uploads/:id/file';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { id } = req.params;

    const result = UploadIdSchema.safeParse(id);
    const upload = result.success ? await findUploadById(result.data) : null;
    if (!upload) {
      throw new ResourceNotFoundError(`Upload ${String(id)} does not exist.`);
    }

    if (upload.username !== res.locals.user.username) {
      throw new ForbiddenError('You can only view your own uploads.');
    }

    const data = await readUploadFile(upload);
    return new ResponseBuilder().withFile({ contentType: upload.mime_type, data });
  }
}
