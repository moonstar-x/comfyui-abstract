import type { Request, RequestHandler } from 'express';
import { GetController } from '../../app/controller/GetController.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseQuery } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { findConversations, toPublicConversation } from '../../services/database/repositories/conversations.js';
import { ConversationsQuerySchema } from '../../services/lmstudio/schemas.js';

/**
 * LM Studio conversations of the current user, pinned first, then most recently active first. One extra row is fetched to tell whether there is a next page.
 */
export default class GetConversationsController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/conversations';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { limit, offset } = parseQuery(ConversationsQuerySchema, req.query);
    const rows = await findConversations({ username: res.locals.user.username, limit: limit + 1, offset });
    const hasMore = rows.length > limit;

    return new ResponseBuilder()
      .withData(rows.slice(0, limit).map((row) => toPublicConversation(row)))
      .withMeta({ limit, offset, hasMore });
  }
}
