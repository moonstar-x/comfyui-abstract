import type { ResponseEvent } from '../../app/http/ResponseBuilder.js';
import type { Nullable } from '../../utils/types.js';
import { getConfig } from '../config/config.js';
import { database } from '../database/client/postgres.js';
import type { ConversationRow, MessageRow } from '../database/models/conversations.js';
import {
  createAssistantMessage,
  createConversation,
  createUserMessage,
  deleteConversation,
  findMessages,
  getConversationWorkflowContext,
  toPublicConversation,
  toPublicMessage,
  touchConversation
} from '../database/repositories/conversations.js';
import type { ConversationWorkflowContext, PublicConversation, PublicMessage } from '../database/repositories/conversations.js';
import { streamChatCompletion } from './client.js';
import type { LmStudioChatDelta, LmStudioChatMessage, LmStudioChatUsage } from './client.js';
import { estimateSystemPromptTokenCount, getContextUsage, selectContextWindow, toTurnTokenCounts } from './context.js';
import type { ContextUsage } from './context.js';
import { assertWorkflowContextExists, buildWorkflowSystemPrompt } from './workflowContext.js';

export const LMSTUDIO_EVENTS = {
  /**
   * The conversation the message belongs to, sent first so a new conversation is known even if the reply is stopped.
   */
  CONVERSATION: 'conversation',
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
  /**
   * The workflow page a new conversation is started from. Ignored when continuing a conversation, which keeps the context it was started with.
   */
  workflowContext: Nullable<ConversationWorkflowContext>;
}

interface SaveTurnData {
  content: string;
  contextLength: number;
  conversation: ConversationRow;
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
   * Estimated tokens of the system prompt sent along with the message.
   */
  systemTokenCount: number;
  /**
   * Null when the reply was cut short before LM Studio reported it.
   */
  usage: Nullable<LmStudioChatUsage>;
  username: string;
}

type TurnContext = Omit<SaveTurnData, 'reasoning' | 'reply' | 'usage'> & {
  /**
   * Whether the conversation was started by this message, so it is removed again when the reply leaves nothing to save.
   */
  isNewConversation: boolean;
};

const MAX_TITLE_LENGTH = 100;

/**
 * Titles a conversation after the first line of its first message.
 */
const toConversationTitle = (content: string): string => {
  const firstLine = content.trim().split('\n', 1)[0]?.trim() ?? '';
  return firstLine.length > MAX_TITLE_LENGTH ? `${firstLine.slice(0, MAX_TITLE_LENGTH - 1)}…` : firstLine;
};

const saveTurn = async (data: SaveTurnData): Promise<LmStudioDoneEvent> => await database.tx(async (t) => {
  const { content, conversation, model, reasoning, reply } = data;
  const tokenCounts = toTurnTokenCounts(data.usage, data.systemTokenCount + data.historyTokenCount, reply, reasoning);

  const userMessage = await createUserMessage({ conversationId: conversation.id, content, tokenCount: tokenCounts.user }, t);
  const assistantMessage = await createAssistantMessage({
    conversationId: conversation.id,
    content: reply,
    reasoning: reasoning === '' ? null : reasoning,
    model,
    tokenCount: tokenCounts.reply
  }, t);
  const updatedConversation = await touchConversation(conversation.id, t);

  return {
    conversation: toPublicConversation(updatedConversation),
    messages: [userMessage, assistantMessage].map((message) => toPublicMessage(message)),
    context: getContextUsage([...data.fullHistory, userMessage, assistantMessage], data.contextLength, data.systemTokenCount)
  };
});

/**
 * Sends the conversation, then the reply as reasoning and delta events, and saves the turn once it is complete, followed by a done event.
 * A failed reply saves nothing, so the conversation is left as it was, or removed if it was started by this message.
 * A reply cut short by the client is saved as far as it got, so stopping a reply keeps it.
 */
async function* streamReply(deltas: AsyncGenerator<LmStudioChatDelta, void, undefined>, context: TurnContext, signal: AbortSignal): AsyncGenerator<ResponseEvent, void, undefined> {
  let reasoning = '';
  let reply = '';
  let usage: Nullable<LmStudioChatUsage> = null;
  let state: 'complete' | 'failed' | 'streaming' = 'streaming';

  try {
    yield { event: LMSTUDIO_EVENTS.CONVERSATION, data: toPublicConversation(context.conversation) };

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
    const hasPartialReply = reply !== '' || reasoning !== '';
    if (state === 'streaming' && hasPartialReply) {
      await saveTurn({ ...context, reasoning, reply, usage });
    } else if (state !== 'complete' && context.isNewConversation) {
      await deleteConversation(context.conversation.id, context.username);
    }
  }

  if (state === 'complete') {
    yield { event: LMSTUDIO_EVENTS.DONE, data: await saveTurn({ ...context, reasoning, reply, usage }) satisfies LmStudioDoneEvent };
  }
}

const getSystemPrompt = (workflowContext: Nullable<ConversationWorkflowContext>): Nullable<string> => workflowContext === null
  ? null
  : buildWorkflowSystemPrompt(workflowContext);

/**
 * Sends a message to LM Studio along with as much of the history of its conversation as fits in the context, using the model in the config.
 * A conversation started from a workflow page is sent with a system prompt that describes that workflow and model.
 * Resolves once LM Studio accepts the request, so errors such as LM Studio being unreachable are thrown before anything is streamed.
 */
export const sendLmStudioMessage = async (data: SendLmStudioMessageData): Promise<AsyncIterable<ResponseEvent>> => {
  const { content, conversation, signal, username } = data;
  const { model, contextLength } = getConfig().lmstudio;
  const workflowContext = conversation ? getConversationWorkflowContext(conversation) : data.workflowContext;
  if (!conversation && workflowContext !== null) {
    assertWorkflowContextExists(workflowContext);
  }

  const systemPrompt = getSystemPrompt(workflowContext);
  const systemTokenCount = estimateSystemPromptTokenCount(systemPrompt);
  const fullHistory = conversation ? await findMessages(conversation.id) : [];
  const { history, historyTokenCount } = selectContextWindow(fullHistory, content, contextLength, systemTokenCount);

  // Reasoning is left out of the history, since models only expect their own past replies.
  const messages: LmStudioChatMessage[] = [
    ...systemPrompt === null ? [] : [{ role: 'system' as const, content: systemPrompt }],
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content }
  ];

  const deltas = await streamChatCompletion(model, messages, signal);
  // Only created once LM Studio accepts the request, so a rejected message leaves nothing behind.
  const target = conversation ?? await createConversation({ username, title: toConversationTitle(content), workflowContext });
  return streamReply(deltas, {
    content,
    contextLength,
    conversation: target,
    fullHistory,
    historyTokenCount,
    isNewConversation: conversation === null,
    model,
    systemTokenCount,
    username
  }, signal);
};

/**
 * How full the context is with the system prompt and the messages of a conversation, using the context length in the config.
 */
export const getConversationContextUsage = (conversation: ConversationRow, messages: MessageRow[]): ContextUsage => {
  const { contextLength } = getConfig().lmstudio;
  const systemTokenCount = estimateSystemPromptTokenCount(getSystemPrompt(getConversationWorkflowContext(conversation)));
  return getContextUsage(messages, contextLength, systemTokenCount);
};
