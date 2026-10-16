import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DeleteController } from '../../app/controller/DeleteController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { deleteUploads, toPublicUpload } from '../../services/database/repositories/uploads.js';
import { DeleteUploadsBodySchema } from '../../services/uploads/schemas.js';
import { deleteUploadFiles } from '../../services/uploads/uploads.js';

/**
 * Deletes several uploads of the current user at once along with their files in the ComfyUI input directory.
 * IDs that don't exist or belong to someone else are skipped, so the response only lists the uploads that were deleted.
 */
export default class DeleteUploadsController extends DeleteController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/uploads';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { ids } = parseBody(DeleteUploadsBodySchema, req.body);

    const deletedUploads = await deleteUploads(ids, username);
    await deleteUploadFiles(deletedUploads);

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(deletedUploads.map((upload) => toPublicUpload(upload)));
  }
}
