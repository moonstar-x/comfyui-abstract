import { z } from 'zod';

export const MAX_CONVERSATIONS_PAGE_SIZE = 100;
const DEFAULT_CONVERSATIONS_PAGE_SIZE = 25;

export const MAX_MESSAGE_LENGTH = 32_000;

export interface ConversationsQuery {
  limit: number;
  offset: number;
}

export const ConversationsQuerySchema: z.ZodType<ConversationsQuery> = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_CONVERSATIONS_PAGE_SIZE).default(DEFAULT_CONVERSATIONS_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0)
});

export const ConversationIdSchema: z.ZodUUID = z.uuid();

export interface SendMessageBody {
  content: string;
  /**
   * The conversation to continue. A new conversation is started when omitted.
   */
  conversationId?: string | undefined;
}

export const SendMessageBodySchema: z.ZodType<SendMessageBody> = z.object({
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  conversationId: ConversationIdSchema.optional()
});
