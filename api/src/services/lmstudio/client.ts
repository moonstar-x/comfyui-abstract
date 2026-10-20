import { TextDecoder } from 'node:util';
import { logger } from '@moonstar-x/logger';
import { z } from 'zod';
import { BadGatewayError } from '../../app/http/errors/BadGatewayError.js';
import { ErrorCodes } from '../../app/http/errors/ErrorCodes.js';
import { LMSTUDIO_API_KEY, LMSTUDIO_URL } from '../../config/environment.js';
import type { Nullable } from '../../utils/types.js';

export interface LmStudioChatMessage {
  content: string;
  role: 'assistant' | 'system' | 'user';
}

/**
 * Tokens used by a chat completion, as reported by LM Studio once the reply is complete.
 */
export interface LmStudioChatUsage {
  /**
   * Tokens of the reply, reasoning included.
   */
  completionTokens: number;
  /**
   * Tokens of every message sent, including the formatting the chat template adds around them.
   */
  promptTokens: number;
  /**
   * Tokens of the reply spent reasoning, or null when LM Studio did not report them.
   */
  reasoningTokens: Nullable<number>;
}

/**
 * A piece of the reply, or the usage once it is complete. Reasoning models think before they write the content, which LM Studio streams separately.
 */
export type LmStudioChatDelta = { text: string; type: 'content' | 'reasoning' } | { type: 'usage'; usage: LmStudioChatUsage };

// The trailing slash keeps any path of the base URL, such as one added by a reverse proxy.
const BASE_URL = LMSTUDIO_URL.endsWith('/') ? LMSTUDIO_URL : `${LMSTUDIO_URL}/`;
const CHAT_COMPLETIONS_URL = new URL('v1/chat/completions', BASE_URL);
const MODELS_URL = new URL('v1/models', BASE_URL);
const DATA_PREFIX = 'data:';
const DONE_PAYLOAD = '[DONE]';

// LM Studio reports errors either as a plain string or as an OpenAI style object.
const LmStudioErrorSchema = z.union([z.string(), z.object({ message: z.string() }).transform(({ message }) => message)]);

const ErrorBodySchema = z.object({
  error: LmStudioErrorSchema
});

const ModelSchema = z.object({
  id: z.string()
});

const ModelsBodySchema = z.object({
  data: z.array(ModelSchema)
});

const ChatCompletionDeltaSchema = z.object({
  content: z.string().nullish(),
  // Named by the LM Studio API.
  // eslint-disable-next-line camelcase
  reasoning_content: z.string().nullish()
});

const ChatCompletionChoiceSchema = z.object({
  delta: ChatCompletionDeltaSchema.default({})
});

// Named by the LM Studio API.
/* eslint-disable camelcase */
const CompletionTokensDetailsSchema = z.object({
  reasoning_tokens: z.number().int().nonnegative().optional()
});

const UsageSchema = z.object({
  completion_tokens: z.number().int().nonnegative(),
  completion_tokens_details: CompletionTokensDetailsSchema.nullish(),
  prompt_tokens: z.number().int().nonnegative()
});
/* eslint-enable camelcase */

const ChatCompletionChunkSchema = z.object({
  choices: z.array(ChatCompletionChoiceSchema).default([]),
  error: LmStudioErrorSchema.optional(),
  usage: UsageSchema.nullish()
});

const getHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...LMSTUDIO_API_KEY !== '' && { Authorization: `Bearer ${LMSTUDIO_API_KEY}` }
});

const getErrorMessage = async (response: Response): Promise<Nullable<string>> => {
  try {
    const result = ErrorBodySchema.safeParse(await response.json());
    return result.success ? result.data.error : null;
  } catch {
    return null;
  }
};

/**
 * Returns the pieces of the reply added by a line of the stream, or DONE_PAYLOAD once the stream is over.
 */
const parseStreamLine = (line: string): LmStudioChatDelta[] | typeof DONE_PAYLOAD => {
  if (!line.startsWith(DATA_PREFIX)) {
    return [];
  }

  const payload = line.slice(DATA_PREFIX.length).trim();
  if (payload === DONE_PAYLOAD) {
    return DONE_PAYLOAD;
  }

  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    throw new BadGatewayError('LM Studio sent a malformed reply.', ErrorCodes.LMSTUDIO_UNAVAILABLE, { cause: error });
  }

  const result = ChatCompletionChunkSchema.safeParse(data);
  if (!result.success) {
    throw new BadGatewayError('LM Studio sent a malformed reply.', ErrorCodes.LMSTUDIO_UNAVAILABLE, { cause: result.error });
  }

  if (result.data.error !== undefined) {
    throw new BadGatewayError(`LM Studio failed to reply: ${result.data.error}`, ErrorCodes.LMSTUDIO_UNAVAILABLE);
  }

  const { choices, usage } = result.data;
  const delta = choices[0]?.delta;
  const deltas: LmStudioChatDelta[] = [
    { type: 'reasoning' as const, text: delta?.reasoning_content ?? '' },
    { type: 'content' as const, text: delta?.content ?? '' }
  ].filter(({ text }) => text !== '');

  if (usage) {
    deltas.push({
      type: 'usage',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? null
      }
    });
  }

  return deltas;
};

/**
 * Yields the pieces of the reply as LM Studio streams them. Stopping the iteration early cancels the stream.
 */
async function* readDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<LmStudioChatDelta, void, undefined> {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    // Streaming keeps characters split across chunks intact.
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/u);
    // The last line may still be incomplete.
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const deltas = parseStreamLine(line);
      if (deltas === DONE_PAYLOAD) {
        return;
      }

      yield* deltas;
    }
  }
}

/**
 * Returns the identifiers of the models LM Studio can use. With just-in-time loading enabled in LM Studio this includes every downloaded model,
 * otherwise only the loaded ones.
 */
export const listLmStudioModels = async (signal: AbortSignal): Promise<string[]> => {
  const response = await fetch(MODELS_URL, { headers: getHeaders(), signal });
  if (!response.ok) {
    throw new Error(`LM Studio rejected the model list request with status ${response.status.toString()}: ${await getErrorMessage(response) ?? 'no details'}.`);
  }

  return ModelsBodySchema.parse(await response.json()).data.map(({ id }) => id);
};

/**
 * Asks LM Studio to reply to the messages through its OpenAI compatible API. Resolves once LM Studio accepts the request,
 * so it can be rejected before anything is streamed, and returns the pieces of the reply as they are generated.
 */
export const streamChatCompletion = async (
  model: string,
  messages: LmStudioChatMessage[],
  signal: AbortSignal
): Promise<AsyncGenerator<LmStudioChatDelta, void, undefined>> => {
  let response: Response;
  try {
    response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: getHeaders(),
      // eslint-disable-next-line camelcase
      body: JSON.stringify({ model, messages, stream: true, stream_options: { include_usage: true } }),
      signal
    });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    throw new BadGatewayError('Could not reach LM Studio.', ErrorCodes.LMSTUDIO_UNAVAILABLE, { cause: error });
  }

  if (!response.ok || response.body === null) {
    const message = await getErrorMessage(response);
    logger.error(`LM Studio rejected a chat completion with status ${response.status.toString()}: ${message ?? 'no details'}.`);
    throw new BadGatewayError(message ?? `LM Studio rejected the request with status ${response.status.toString()}.`, ErrorCodes.LMSTUDIO_UNAVAILABLE);
  }

  return readDeltas(response.body);
};
