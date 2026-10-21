import type { Request, RequestHandler } from 'express';
import { GetController } from '../../app/controller/GetController.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import type { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseQuery } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { RESERVED_USERNAMES } from '../../services/auth/reserved.js';
import { findUserByUsername } from '../../services/database/repositories/users.js';
import { respondWithGenerationsPage } from '../../services/generations/history.js';
import { GenerationsQuerySchema } from '../../services/generations/schemas.js';

/**
 * Generations of a single user, newest first. The current user's are available under /users/me/generations.
 */
export default class GetUserGenerationsController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/users/:username/generations';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username: requestedUsername } = req.params;
    const username = requestedUsername === RESERVED_USERNAMES.CURRENT_USER ? res.locals.user.username : String(requestedUsername);
    const query = parseQuery(GenerationsQuerySchema, req.query);

    const user = await findUserByUsername(username);
    if (!user) {
      throw new ResourceNotFoundError(`User ${username} does not exist.`);
    }

    return await respondWithGenerationsPage(query, user.username);
  }
}
