import type { Request, RequestHandler } from 'express';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseQuery } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { findUploads, toPublicUpload } from '../../services/database/repositories/uploads.js';
import { UploadsQuerySchema } from '../../services/uploads/schemas.js';

/**
 * Uploads of the current user, newest first. One extra row is fetched to tell whether there is a next page.
 */
export default class GetUserUploadsController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path: string = `/users/${RESERVED_USERNAMES.CURRENT_USER}/uploads`;

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { mediaType, limit, offset } = parseQuery(UploadsQuerySchema, req.query);
    const rows = await findUploads({ username: res.locals.user.username, mediaType, limit: limit + 1, offset });
    const hasMore = rows.length > limit;

    return new ResponseBuilder()
      .withData(rows.slice(0, limit).map((row) => toPublicUpload(row)))
      .withMeta({ limit, offset, hasMore });
  }
}
