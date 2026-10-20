import type { Request, RequestHandler } from 'express';
import { PostController } from '../../app/controller/PostController.js';
import { ForbiddenError } from '../../app/http/errors/ForbiddenError.js';
import { ResourceNotFoundError } from '../../app/http/errors/ResourceNotFoundError.js';
import { ResponseBuilder } from '../../app/http/ResponseBuilder.js';
import { parseBody } from '../../app/http/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedResponse } from '../../middleware/auth.js';
import { findConversationById } from '../../services/database/repositories/conversations.js';
import { sendLmStudioMessage } from '../../services/lmstudio/conversations.js';
import { SendMessageBodySchema } from '../../services/lmstudio/schemas.js';

/**
 * Sends a message to LM Studio, continuing a conversation of the current user or starting a new one when no conversationId is given.
 * The reply is streamed as server-sent events: a "conversation" event carries the conversation first, "reasoning" events carry pieces of
 * what a reasoning model thinks before it replies, "delta" events carry pieces of the reply, then a "done" event carries the saved
 * conversation and messages, or an "error" event if the reply failed midway. Errors before the reply starts are regular error responses.
 * Disconnecting stops the reply and keeps what was generated so far.
 */
export default class PostMessageController extends PostController {
  public override readonly middleware: RequestHandler[] = [requireAuth];
  public readonly path = '/messages';

  public override async handle(req: Request, res: AuthenticatedResponse): Promise<ResponseBuilder> {
    const { username } = res.locals.user;
    const { content, conversationId } = parseBody(SendMessageBodySchema, req.body);

    const conversation = conversationId === undefined ? null : await findConversationById(conversationId);
    if (conversationId !== undefined && !conversation) {
      throw new ResourceNotFoundError(`Conversation ${conversationId} does not exist.`);
    }

    if (conversation && conversation.username !== username) {
      throw new ForbiddenError('You can only send messages to your own conversations.');
    }

    // Closing also happens once the response finishes, when aborting no longer has any effect.
    const abortController = new AbortController();
    res.on('close', () => {
      abortController.abort();
    });

    const events = await sendLmStudioMessage({ content, conversation, signal: abortController.signal, username });
    return new ResponseBuilder().withEventStream(events);
  }
}
