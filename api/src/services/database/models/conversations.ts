/**
 * Must match the roles allowed by the messages table.
 */
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const;
export type MessageRole = typeof MESSAGE_ROLES[keyof typeof MESSAGE_ROLES];

export interface ConversationRow {
  created_at: Date;
  id: string;
  title: string;
  updated_at: Date;
  username: string;
}

export interface MessageRow {
  content: string;
  conversation_id: string;
  created_at: Date;
  id: string;
  /**
   * Only set for assistant messages.
   */
  model: null | string;
  /**
   * Only set for assistant messages written by a reasoning model.
   */
  reasoning: null | string;
  role: MessageRole;
  /**
   * Tokens the message takes up when sent back to the model, or null when LM Studio did not report it.
   */
  token_count: null | number;
}
