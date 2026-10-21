import { BadRequestError } from '../../app/http/errors/BadRequestError.js';
import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import type { Nullable } from '../../utils/types.js';
import type { MessageRow } from '../database/models/conversations.js';
import { MESSAGE_ROLES } from '../database/models/conversations.js';
import type { LmStudioChatUsage } from './client.js';

/**
 * Share of the context length the prompt may take up. The rest is left for the reply, reasoning included.
 */
const PROMPT_BUDGET_RATIO = 0.75;

/**
 * Most tokenizers average around 4 characters per token for English. Fewer characters per token overestimates,
 * which only makes the window a little shorter than it could be instead of overflowing it.
 */
const ESTIMATED_CHARACTERS_PER_TOKEN = 3;

/**
 * Tokens the chat template adds around every message, such as the role markers.
 */
const ESTIMATED_MESSAGE_OVERHEAD_TOKENS = 8;

export interface ContextWindow {
  /**
   * The latest messages of the history that fit, oldest first.
   */
  history: MessageRow[];
  /**
   * Tokens of the history in the window, counted the same way as the stored token counts.
   */
  historyTokenCount: number;
}

/**
 * How full the context of the model is with the history the next message would be sent with, like the context indicator of LM Studio.
 */
export interface ContextUsage {
  contextLength: number;
  /**
   * Share of the context length the history takes up, from 0 to 100. Trimming keeps it under the share reserved for the prompt.
   */
  percentage: number;
  /**
   * How many of the oldest messages no longer fit and are left out of the context.
   */
  trimmedMessageCount: number;
  /**
   * Tokens of the system prompt and the history, partly estimated for messages LM Studio did not report a token count for.
   */
  usedTokens: number;
}

export interface TurnTokenCounts {
  reply: Nullable<number>;
  user: Nullable<number>;
}

const estimateTokenCount = (content: string): number => Math.ceil(content.length / ESTIMATED_CHARACTERS_PER_TOKEN) + ESTIMATED_MESSAGE_OVERHEAD_TOKENS;

/**
 * Tokens of the system prompt, estimated since LM Studio only reports the prompt as a whole.
 */
export const estimateSystemPromptTokenCount = (systemPrompt: Nullable<string>): number => systemPrompt === null ? 0 : estimateTokenCount(systemPrompt);

const getTokenCount = (message: MessageRow): number => message.token_count ?? estimateTokenCount(message.content);

const getPromptBudget = (contextLength: number): number => Math.floor(contextLength * PROMPT_BUDGET_RATIO);

/**
 * Picks the latest messages of the history that fit in the given number of tokens.
 */
const fitHistory = (history: MessageRow[], budget: number): ContextWindow => {
  let tokenCount = 0;
  let start = history.length;
  for (const message of history.toReversed()) {
    const messageTokenCount = getTokenCount(message);
    if (tokenCount + messageTokenCount > budget) {
      break;
    }

    tokenCount += messageTokenCount;
    start -= 1;
  }

  // Chat templates such as Gemma's require the messages to start with one of the user.
  const fittingHistory = history.slice(start);
  const firstUserIndex = fittingHistory.findIndex((message) => message.role === MESSAGE_ROLES.USER);
  const windowHistory = firstUserIndex === -1 ? [] : fittingHistory.slice(firstUserIndex);
  return {
    history: windowHistory,
    historyTokenCount: windowHistory.reduce((sum, message) => sum + getTokenCount(message), 0)
  };
};

/**
 * Picks the latest messages of the history that fit in the context along with the system prompt and the new message. Older messages stay saved,
 * the model just no longer sees them. Throws when the system prompt and the new message alone do not fit.
 */
export const selectContextWindow = (history: MessageRow[], content: string, contextLength: number, systemTokenCount: number): ContextWindow => {
  const budget = getPromptBudget(contextLength) - systemTokenCount;
  if (budget <= 0) {
    const message = 'The instructions of the workflow of this chat are too long for the context of the model. Start a new chat from another page.';
    throw new BadRequestError(message, ErrorCodes.MESSAGE_TOO_LONG);
  }

  const contentTokenCount = estimateTokenCount(content);
  if (contentTokenCount > budget) {
    throw new BadRequestError(`The message is too long for the context of the model. Keep it under about ${(budget * ESTIMATED_CHARACTERS_PER_TOKEN).toString()} characters.`, ErrorCodes.MESSAGE_TOO_LONG);
  }

  return fitHistory(history, budget - contentTokenCount);
};

export const getContextUsage = (history: MessageRow[], contextLength: number, systemTokenCount: number): ContextUsage => {
  const window = fitHistory(history, Math.max(getPromptBudget(contextLength) - systemTokenCount, 0));
  const usedTokens = systemTokenCount + window.historyTokenCount;
  return {
    contextLength,
    usedTokens,
    percentage: Math.min(Math.round(usedTokens / contextLength * 100), 100),
    trimmedMessageCount: history.length - window.history.length
  };
};

/**
 * Works out the tokens the new message and its reply will take up as history from the usage of the reply. The prompt holds the system prompt,
 * the history and the new message, so the new message is whatever the system prompt and the history do not account for.
 * Reasoning is never sent back, so it is left out of the reply.
 */
export const toTurnTokenCounts = (usage: Nullable<LmStudioChatUsage>, promptTokenCount: number, reply: string, reasoning: string): TurnTokenCounts => {
  if (!usage) {
    return { user: null, reply: null };
  }

  const { promptTokens, completionTokens, reasoningTokens } = usage;
  const userTokenCount = promptTokens - promptTokenCount;

  let replyTokenCount = completionTokens;
  if (reasoningTokens !== null && reasoningTokens > 0) {
    replyTokenCount = completionTokens - reasoningTokens;
  } else if (reasoning !== '') {
    // Not every model reports its reasoning tokens, so they are split off in proportion to the text.
    replyTokenCount = Math.round(completionTokens * reply.length / (reply.length + reasoning.length));
  }

  return {
    // Estimated token counts in the history can make the difference meaningless.
    user: userTokenCount > 0 ? userTokenCount : null,
    reply: Math.max(replyTokenCount, 0)
  };
};
