import type { Request, RequestHandler } from 'express';
import { GetController } from '../../app/controller/GetController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import {
  findConversationById,
  findMessages,
  toPublicConversation,
  toPublicMessage
} from '../../services/database/repositories/conversations.js';
import { getConversationContextUsage } from '../../services/lmstudio/conversations.js';
import { ConversationIdSchema } from '../../services/lmstudio/schemas.js';

/**
 * An LM Studio conversation of the current user along with its messages, oldest first, and how full the context of the model is with them.
 */
export default class GetConversationController extends GetController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/conversations/:id';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { id } = req.params;

    const result = ConversationIdSchema.safeParse(id);
    const conversation = result.success ? await findConversationById(result.data) : null;
    if (!conversation) {
      throw new ResourceNotFoundError(`Conversation ${String(id)} does not exist.`);
    }

    if (conversation.username !== res.locals.user.username) {
      throw new ForbiddenError('You can only view your own conversations.');
    }

    const messages = await findMessages(conversation.id);
    return new ResponseBuilder().withData({
      ...toPublicConversation(conversation),
      messages: messages.map((message) => toPublicMessage(message)),
      context: getConversationContextUsage(messages)
    });
  }
}
