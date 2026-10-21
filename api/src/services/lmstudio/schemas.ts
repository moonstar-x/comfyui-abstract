import { z } from 'zod';
import { WORKFLOW_TYPES } from '../../workflows/types.js';
import type { ConversationWorkflowContext } from '../database/repositories/conversations.js';

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
  /**
   * The workflow page a new conversation is started from, whose instructions the model is told about. Only allowed when starting a conversation,
   * since a conversation keeps the context it was started with.
   */
  workflowContext?: ConversationWorkflowContext | undefined;
}

const WorkflowContextSchema: z.ZodType<ConversationWorkflowContext> = z.object({
  model: z.string().min(1),
  type: z.enum(Object.values(WORKFLOW_TYPES))
});

export const SendMessageBodySchema: z.ZodType<SendMessageBody> = z.object({
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  conversationId: ConversationIdSchema.optional(),
  workflowContext: WorkflowContextSchema.optional()
}).refine(({ conversationId, workflowContext }) => conversationId === undefined || workflowContext === undefined, {
  message: 'A workflow context can only be given when starting a conversation.',
  path: ['workflowContext']
});

export interface UpdateConversationBody {
  pinned: boolean;
}

export const UpdateConversationBodySchema: z.ZodType<UpdateConversationBody> = z.object({
  pinned: z.boolean()
});
