import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DeleteController } from '../../app/controller/DeleteController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import {
  deleteConversation,
  findConversationById,
  toPublicConversation
} from '../../services/database/repositories/conversations.js';
import { ConversationIdSchema } from '../../services/lmstudio/schemas.js';

/**
 * Deletes an LM Studio conversation of the current user along with its messages.
 */
export default class DeleteConversationController extends DeleteController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/conversations/:id';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { id } = req.params;

    const result = ConversationIdSchema.safeParse(id);
    const conversation = result.success ? await findConversationById(result.data) : null;
    if (!conversation) {
      throw new ResourceNotFoundError(`Conversation ${String(id)} does not exist.`);
    }

    if (conversation.username !== username) {
      throw new ForbiddenError('You can only delete your own conversations.');
    }

    const deletedConversation = await deleteConversation(conversation.id, username);
    if (!deletedConversation) {
      throw new ResourceNotFoundError(`Conversation ${conversation.id} does not exist.`);
    }

    return new ResponseBuilder().withStatus(StatusCodes.OK).withData(toPublicConversation(deletedConversation));
  }
}
