import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { countGenerationsByUsername } from '../../services/database/repositories/generations.js';

/**
 * How many generations the current user has made.
 */
export default class GetUserGenerationCountController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path: string = `/users/${RESERVED_USERNAMES.CURRENT_USER}/generations/count`;

  public override async handle(_req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const count = await countGenerationsByUsername(res.locals.user.username);
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData({ count });
  }
}
