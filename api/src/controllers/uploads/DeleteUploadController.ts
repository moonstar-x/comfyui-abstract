import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DeleteController } from '../../app/controller/DeleteController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { deleteUpload, findUploadById, toPublicUpload } from '../../services/database/repositories/uploads.js';
import { UploadIdSchema } from '../../services/uploads/schemas.js';
import { deleteUploadFiles } from '../../services/uploads/uploads.js';

/**
 * Deletes an upload of the current user along with its file in the ComfyUI input directory.
 */
export default class DeleteUploadController extends DeleteController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/uploads/:id';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { id } = req.params;

    const result = UploadIdSchema.safeParse(id);
    const upload = result.success ? await findUploadById(result.data) : null;
    if (!upload) {
      throw new ResourceNotFoundError(`Upload ${String(id)} does not exist.`);
    }

    if (upload.username !== username) {
      throw new ForbiddenError('You can only delete your own uploads.');
    }

    const deletedUpload = await deleteUpload(upload.id, username);
    if (!deletedUpload) {
      throw new ResourceNotFoundError(`Upload ${upload.id} does not exist.`);
    }

    await deleteUploadFiles([deletedUpload]);
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicUpload(deletedUpload));
  }
}
