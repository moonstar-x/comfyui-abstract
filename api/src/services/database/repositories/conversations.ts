import type { Nullable } from '../../../utils/types.js';
import { database } from '../client/postgres.js';
import type { DatabaseConnection } from '../client/postgres.js';
import { MESSAGE_ROLES } from '../models/conversations.js';
import type { ConversationRow, MessageRole, MessageRow } from '../models/conversations.js';

/**
 * The workflow page a conversation was started from.
 */
export interface ConversationWorkflowContext {
  /**
   * Alias of the model in the config.
   */
  model: string;
  type: string;
}

export interface PublicConversation {
  createdAt: Date;
  id: string;
  pinnedAt: Nullable<Date>;
  title: string;
  updatedAt: Date;
  username: string;
  workflowContext: Nullable<ConversationWorkflowContext>;
}

export interface PublicMessage {
  content: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  model: Nullable<string>;
  reasoning: Nullable<string>;
  role: MessageRole;
  tokenCount: Nullable<number>;
}

export interface CreateUserMessageData {
  content: string;
  conversationId: string;
  tokenCount: Nullable<number>;
}

export interface CreateAssistantMessageData extends CreateUserMessageData {
  model: string;
  reasoning: Nullable<string>;
}

export interface FindConversationsFilter {
  limit: number;
  offset: number;
  username: string;
}

export const getConversationWorkflowContext = (conversation: ConversationRow): Nullable<ConversationWorkflowContext> => {
  const { workflow_model: model, workflow_type: type } = conversation;
  return model === null || type === null ? null : { model, type };
};

export const toPublicConversation = (conversation: ConversationRow): PublicConversation => ({
  id: conversation.id,
  username: conversation.username,
  title: conversation.title,
  pinnedAt: conversation.pinned_at,
  workflowContext: getConversationWorkflowContext(conversation),
  createdAt: conversation.created_at,
  updatedAt: conversation.updated_at
});

export const toPublicMessage = (message: MessageRow): PublicMessage => ({
  id: message.id,
  conversationId: message.conversation_id,
  role: message.role,
  content: message.content,
  reasoning: message.reasoning,
  model: message.model,
  tokenCount: message.token_count,
  createdAt: message.created_at
});

export interface CreateConversationData {
  title: string;
  username: string;
  workflowContext: Nullable<ConversationWorkflowContext>;
}

export const createConversation = async ({ title, username, workflowContext }: CreateConversationData, connection: DatabaseConnection = database): Promise<ConversationRow> => {
  const query = 'INSERT INTO conversations(username, title, workflow_type, workflow_model) VALUES($1, $2, $3, $4) RETURNING *';
  return await connection.one<ConversationRow>(query, [username, title, workflowContext?.type ?? null, workflowContext?.model ?? null]);
};

export const findConversationById = async (id: string): Promise<Nullable<ConversationRow>> => {
  const query = 'SELECT * FROM conversations WHERE id = $1';
  return await database.oneOrNone<ConversationRow>(query, [id]);
};

/**
 * Returns a user's conversations, pinned first, then most recently active first.
 */
export const findConversations = async ({ username, limit, offset }: FindConversationsFilter): Promise<ConversationRow[]> => {
  const query = `SELECT * FROM conversations
    WHERE username = $1
    ORDER BY pinned_at IS NULL, updated_at DESC, id DESC
    LIMIT $2 OFFSET $3`;

  return await database.manyOrNone<ConversationRow>(query, [username, limit, offset]);
};

/**
 * Bumps the conversation to the top of the list of its user.
 */
export const touchConversation = async (id: string, connection: DatabaseConnection = database): Promise<ConversationRow> => {
  const query = 'UPDATE conversations SET updated_at = now() WHERE id = $1 RETURNING *';
  return await connection.one<ConversationRow>(query, [id]);
};

/**
 * Pins the conversation to the top of the list of its user, or unpins it. Keeps when it was pinned if it already was.
 */
export const setConversationPinned = async (id: string, isPinned: boolean): Promise<ConversationRow> => {
  const query = isPinned
    ? 'UPDATE conversations SET pinned_at = COALESCE(pinned_at, now()) WHERE id = $1 RETURNING *'
    : 'UPDATE conversations SET pinned_at = NULL WHERE id = $1 RETURNING *';
  return await database.one<ConversationRow>(query, [id]);
};

/**
 * Deletes a conversation and its messages only if it belongs to the given user. Returns the deleted conversation,
 * or null if it does not exist or belongs to someone else.
 */
export const deleteConversation = async (id: string, username: string): Promise<Nullable<ConversationRow>> => {
  const query = 'DELETE FROM conversations WHERE id = $1 AND username = $2 RETURNING *';
  return await database.oneOrNone<ConversationRow>(query, [id, username]);
};

/**
 * Returns the messages of a conversation in the order they were sent.
 */
export const findMessages = async (conversationId: string): Promise<MessageRow[]> => {
  const query = 'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at, id';
  return await database.manyOrNone<MessageRow>(query, [conversationId]);
};

export const createUserMessage = async (data: CreateUserMessageData, connection: DatabaseConnection = database): Promise<MessageRow> => {
  const query = 'INSERT INTO messages(conversation_id, role, content, token_count) VALUES($1, $2, $3, $4) RETURNING *';
  return await connection.one<MessageRow>(query, [data.conversationId, MESSAGE_ROLES.USER, data.content, data.tokenCount]);
};

export const createAssistantMessage = async (data: CreateAssistantMessageData, connection: DatabaseConnection = database): Promise<MessageRow> => {
  const query = 'INSERT INTO messages(conversation_id, role, content, reasoning, model, token_count) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
  return await connection.one<MessageRow>(query, [
    data.conversationId,
    MESSAGE_ROLES.ASSISTANT,
    data.content,
    data.reasoning,
    data.model,
    data.tokenCount
  ]);
};
