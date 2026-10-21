import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PatchController } from '../../app/controller/PatchController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import {
  findConversationById,
  setConversationPinned,
  toPublicConversation
} from '../../services/database/repositories/conversations.js';
import { ConversationIdSchema, UpdateConversationBodySchema } from '../../services/lmstudio/schemas.js';

/**
 * Pins an LM Studio conversation of the current user to the top of their list, or unpins it.
 */
export default class PatchConversationController extends PatchController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/conversations/:id';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { id } = req.params;
    const { pinned } = parseBody(UpdateConversationBodySchema, req.body);

    const result = ConversationIdSchema.safeParse(id);
    const conversation = result.success ? await findConversationById(result.data) : null;
    if (!conversation) {
      throw new ResourceNotFoundError(`Conversation ${String(id)} does not exist.`);
    }

    if (conversation.username !== res.locals.user.username) {
      throw new ForbiddenError('You can only update your own conversations.');
    }

    const updatedConversation = await setConversationPinned(conversation.id, pinned);
    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicConversation(updatedConversation));
  }
}
