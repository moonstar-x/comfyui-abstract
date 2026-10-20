import type { Nullable } from '@core/utils/types';
import { ApiError, ApiErrorCodes, apiRequest, apiRequestStream, apiRequestWithMeta } from '@services/api/client';

export type MessageRole = 'assistant' | 'user';

/**
 * A conversation of the current user with the LM Studio model.
 */
export interface ConversationRecord {
  createdAt: string;
  id: string;
  title: string;
  // Bumped by every message, so the most recently active conversations come first.
  updatedAt: string;
}

export interface MessageRecord {
  content: string;
  conversationId: string;
  createdAt: string;
  id: string;
  // The model that wrote an assistant message, null for user messages.
  model: Nullable<string>;
  // What a reasoning model thought before writing an assistant message.
  reasoning: Nullable<string>;
  role: MessageRole;
}

/**
 * How full the context of the model is with the history the next message would be sent with.
 */
export interface ContextUsage {
  contextLength: number;
  // From 0 to 100.
  percentage: number;
  // How many of the oldest messages no longer fit and are left out of the context.
  trimmedMessageCount: number;
  usedTokens: number;
}

export interface ConversationDetail extends ConversationRecord {
  context: ContextUsage;
  // Oldest first.
  messages: MessageRecord[];
}

export interface ConversationsPage {
  conversations: ConversationRecord[];
  hasMore: boolean;
  offset: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isNullableString = (value: unknown): value is Nullable<string> => value === null || typeof value === 'string';

const isConversationRecord = (value: unknown): value is ConversationRecord => isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['title'] === 'string' &&
  typeof value['createdAt'] === 'string' &&
  typeof value['updatedAt'] === 'string';

const isMessageRecord = (value: unknown): value is MessageRecord => isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['conversationId'] === 'string' &&
  (value['role'] === 'assistant' || value['role'] === 'user') &&
  typeof value['content'] === 'string' &&
  isNullableString(value['reasoning']) &&
  isNullableString(value['model']) &&
  typeof value['createdAt'] === 'string';

const isConversationRecordList = (value: unknown): value is ConversationRecord[] => Array.isArray(value) && value.every((item) => isConversationRecord(item));

const isMessageRecordList = (value: unknown): value is MessageRecord[] => Array.isArray(value) && value.every((item) => isMessageRecord(item));

const isContextUsage = (value: unknown): value is ContextUsage => isRecord(value) &&
  typeof value['contextLength'] === 'number' &&
  typeof value['percentage'] === 'number' &&
  typeof value['trimmedMessageCount'] === 'number' &&
  typeof value['usedTokens'] === 'number';

const isConversationDetail = (value: unknown): value is ConversationDetail => isConversationRecord(value) &&
  isRecord(value) &&
  isMessageRecordList(value['messages']) &&
  isContextUsage(value['context']);

/**
 * Returns a page of the current user's conversations, most recently active first.
 */
export const fetchConversations = async (offset: number, limit: number): Promise<ConversationsPage> => {
  const search = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  const { data, meta } = await apiRequestWithMeta(`/conversations?${search.toString()}`, { isAuthenticated: true });
  if (!isConversationRecordList(data)) {
    throw new Error('The server returned an invalid list of conversations.');
  }

  return { conversations: data, hasMore: meta['hasMore'] === true, offset };
};

export const fetchConversation = async (id: string): Promise<ConversationDetail> => {
  const data = await apiRequest(`/conversations/${encodeURIComponent(id)}`, { isAuthenticated: true });
  if (!isConversationDetail(data)) {
    throw new Error('The server returned an invalid conversation.');
  }

  return data;
};

/**
 * Deletes a conversation of the current user along with its messages.
 */
export const deleteConversation = async (id: string): Promise<void> => {
  await apiRequest(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE', isAuthenticated: true });
};

// The conversation the message belongs to, sent first so a new chat learns its ID even if the reply is stopped.
export interface ConversationStreamEvent {
  conversation: ConversationRecord;
  type: 'conversation';
}

// A piece of the reply, or of what a reasoning model thinks before it replies.
export interface DeltaStreamEvent {
  content: string;
  type: 'delta' | 'reasoning';
}

// The reply is complete and was saved along with the message that prompted it.
export interface DoneStreamEvent {
  context: ContextUsage;
  conversation: ConversationRecord;
  // The message of the user followed by the reply.
  messages: MessageRecord[];
  type: 'done';
}

export type MessageStreamEvent = ConversationStreamEvent | DeltaStreamEvent | DoneStreamEvent;

const getContent = (data: unknown): string => isRecord(data) && typeof data['content'] === 'string' ? data['content'] : '';

/**
 * Turns a server-sent event into a stream event. An error event becomes an ApiError, the same as an error response would.
 */
const toStreamEvent = (event: string, data: unknown): Nullable<MessageStreamEvent> => {
  switch (event) {
    case 'conversation':
      return isConversationRecord(data) ? { type: 'conversation', conversation: data } : null;

    case 'delta':
    case 'reasoning':
      return { type: event, content: getContent(data) };

    case 'done':
      if (!isRecord(data) || !isConversationRecord(data['conversation']) || !isMessageRecordList(data['messages']) || !isContextUsage(data['context'])) {
        throw new Error('The server returned an invalid reply.');
      }

      return { type: 'done', conversation: data['conversation'], messages: data['messages'], context: data['context'] };

    case 'error': {
      const code = isRecord(data) && typeof data['code'] === 'string' ? data['code'] : ApiErrorCodes.UNKNOWN_ERROR;
      const message = isRecord(data) && typeof data['message'] === 'string' ? data['message'] : 'The reply failed.';
      // The stream had already started with a successful status.
      throw new ApiError(message, { code, status: 200 });
    }

    default:
      return null;
  }
};

/**
 * Parses one block of a server-sent event stream, which the API always writes as an event line followed by a JSON data line.
 */
const parseEventBlock = (block: string): Nullable<MessageStreamEvent> => {
  let event = 'message';
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      data += line.slice('data:'.length).trim();
    }
  }

  if (data === '') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new Error('The server sent a malformed reply.', { cause: error });
  }

  return toStreamEvent(event, parsed);
};

export interface SendMessageData {
  content: string;
  // Starts a new conversation when omitted.
  conversationId?: string | undefined;
}

/**
 * Sends a message and yields the reply as the API streams it. Aborting the signal stops the reply, which the API keeps as far as it got.
 */
export async function* streamMessage({ content, conversationId }: SendMessageData, signal: AbortSignal): AsyncGenerator<MessageStreamEvent, void, undefined> {
  const body = await apiRequestStream('/messages', { method: 'POST', body: { content, conversationId }, isAuthenticated: true, signal });
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of body) {
    // Streaming keeps characters split across chunks intact.
    buffer += decoder.decode(chunk, { stream: true }).replaceAll('\r\n', '\n');
    const blocks = buffer.split('\n\n');
    // The last block may still be incomplete.
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const event = parseEventBlock(block);
      if (event !== null) {
        yield event;
      }
    }
  }
}
