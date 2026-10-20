import type { ResponseEvent } from '../../app/http/ResponseBuilder.js';
import type { Nullable } from '../../utils/types.js';
import { getConfig } from '../config/config.js';
import { database } from '../database/client/postgres.js';
import type { ConversationRow, MessageRow } from '../database/models/conversations.js';
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
  findMessages,
  toPublicConversation,
  toPublicMessage,
  touchConversation
} from '../database/repositories/conversations.js';
import type { PublicConversation, PublicMessage } from '../database/repositories/conversations.js';
import { streamChatCompletion } from './client.js';
import type { LmStudioChatDelta, LmStudioChatUsage } from './client.js';
import { getContextUsage, selectContextWindow, toTurnTokenCounts } from './context.js';
import type { ContextUsage } from './context.js';

export const LMSTUDIO_EVENTS = {
  /**
   * A piece of the reply, sent as LM Studio generates it.
   */
  DELTA: 'delta',
  /**
   * A piece of what a reasoning model thinks before it replies, sent as LM Studio generates it.
   */
  REASONING: 'reasoning',
  /**
   * The reply is complete and was saved along with the message that prompted it.
   */
  DONE: 'done'
} as const;

export interface LmStudioDeltaEvent {
  content: string;
}

export interface LmStudioDoneEvent {
  /**
   * How full the context is now that the reply is part of the history.
   */
  context: ContextUsage;
  conversation: PublicConversation;
  /**
   * The message of the user followed by the reply.
   */
  messages: PublicMessage[];
}

export interface SendLmStudioMessageData {
  content: string;
  /**
   * The conversation to continue, or null to start a new one.
   */
  conversation: Nullable<ConversationRow>;
  /**
   * Aborts the reply, such as when the client disconnects.
   */
  signal: AbortSignal;
  username: string;
}

interface SaveTurnData {
  content: string;
  contextLength: number;
  conversation: Nullable<ConversationRow>;
  /**
   * Every message of the conversation before this turn, including those left out of the context.
   */
  fullHistory: MessageRow[];
  /**
   * Tokens of the history sent along with the message.
   */
  historyTokenCount: number;
  model: string;
  reasoning: string;
  reply: string;
  /**
   * Null when the reply was cut short before LM Studio reported it.
   */
  usage: Nullable<LmStudioChatUsage>;
  username: string;
}

type TurnContext = Omit<SaveTurnData, 'reasoning' | 'reply' | 'usage'>;

const MAX_TITLE_LENGTH = 100;

/**
 * Titles a conversation after the first line of its first message.
 */
const toConversationTitle = (content: string): string => {
  const firstLine = content.trim().split('\n', 1)[0]?.trim() ?? '';
  return firstLine.length > MAX_TITLE_LENGTH ? `${firstLine.slice(0, MAX_TITLE_LENGTH - 1)}…` : firstLine;
};

const saveTurn = async (data: SaveTurnData): Promise<LmStudioDoneEvent> => await database.tx(async (t) => {
  const { content, conversation, model, reasoning, reply, username } = data;
  const tokenCounts = toTurnTokenCounts(data.usage, data.historyTokenCount, reply, reasoning);

  const target = conversation ?? await createConversation(username, toConversationTitle(content), t);
  const userMessage = await createUserMessage({ conversationId: target.id, content, tokenCount: tokenCounts.user }, t);
  const assistantMessage = await createAssistantMessage({
    conversationId: target.id,
    content: reply,
    reasoning: reasoning === '' ? null : reasoning,
    model,
    tokenCount: tokenCounts.reply
  }, t);
  const updatedConversation = conversation ? await touchConversation(target.id, t) : target;

  return {
    conversation: toPublicConversation(updatedConversation),
    messages: [userMessage, assistantMessage].map((message) => toPublicMessage(message)),
    context: getContextUsage([...data.fullHistory, userMessage, assistantMessage], data.contextLength)
  };
});

/**
 * Sends the reply as reasoning and delta events and saves the turn once it is complete, followed by a done event. A failed reply saves nothing,
 * so the conversation is left as it was. A reply cut short by the client is saved as far as it got, so stopping a reply keeps it.
 */
async function* streamReply(deltas: AsyncGenerator<LmStudioChatDelta, void, undefined>, context: TurnContext, signal: AbortSignal): AsyncGenerator<ResponseEvent, void, undefined> {
  let reasoning = '';
  let reply = '';
  let usage: Nullable<LmStudioChatUsage> = null;
  let state: 'complete' | 'failed' | 'streaming' = 'streaming';

  try {
    for await (const delta of deltas) {
      if (delta.type === 'usage') {
        ({ usage } = delta);
      } else if (delta.type === 'reasoning') {
        reasoning += delta.text;
        yield { event: LMSTUDIO_EVENTS.REASONING, data: { content: delta.text } satisfies LmStudioDeltaEvent };
      } else {
        reply += delta.text;
        yield { event: LMSTUDIO_EVENTS.DELTA, data: { content: delta.text } satisfies LmStudioDeltaEvent };
      }
    }

    state = 'complete';
  } catch (error) {
    // Aborting makes the stream throw, which only means the client is gone.
    if (!signal.aborted) {
      state = 'failed';
      throw error;
    }
  } finally {
    // Also runs when the response stops consuming the events because the client disconnected.
    if (state === 'streaming' && (reply !== '' || reasoning !== '')) {
      await saveTurn({ ...context, reasoning, reply, usage });
    }
  }

  if (state === 'complete') {
    yield { event: LMSTUDIO_EVENTS.DONE, data: await saveTurn({ ...context, reasoning, reply, usage }) satisfies LmStudioDoneEvent };
  }
}

/**
 * Sends a message to LM Studio along with as much of the history of its conversation as fits in the context, using the model in the config.
 * Resolves once LM Studio accepts the request, so errors such as LM Studio being unreachable are thrown before anything is streamed.
 */
export const sendLmStudioMessage = async ({ content, conversation, signal, username }: SendLmStudioMessageData): Promise<AsyncIterable<ResponseEvent>> => {
  const { model, contextLength } = getConfig().lmstudio;
  const fullHistory = conversation ? await findMessages(conversation.id) : [];
  const { history, historyTokenCount } = selectContextWindow(fullHistory, content, contextLength);

  // Reasoning is left out of the history, since models only expect their own past replies.
  const messages = [
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user' as const, content }
  ];

  const deltas = await streamChatCompletion(model, messages, signal);
  return streamReply(deltas, { content, contextLength, conversation, fullHistory, historyTokenCount, model, username }, signal);
};

/**
 * How full the context is with the messages of a conversation, using the context length in the config.
 */
export const getConversationContextUsage = (messages: MessageRow[]): ContextUsage => {
  const { contextLength } = getConfig().lmstudio;
  return getContextUsage(messages, contextLength);
};
