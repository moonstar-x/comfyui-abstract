import { logger } from '@moonstar-x/logger';
import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { resolveApiResponseError } from '../../middleware/handlers.js';
import type { ResponseEvent } from './ResponseBuilder.js';

export const ERROR_EVENT = 'error';

const formatEvent = ({ event, data }: ResponseEvent): string => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/**
 * Writes the events as a server-sent event stream. Once the stream starts the status can no longer change, so an error
 * thrown by the events is sent as a final error event with the same payload as an error response.
 * The events stop being consumed as soon as the client disconnects.
 */
export const sendEventStream = async (res: Response, statusCode: number, events: AsyncIterable<ResponseEvent>): Promise<void> => {
  res.status(statusCode).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Stops reverse proxies such as nginx from buffering the stream.
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  try {
    for await (const event of events) {
      if (res.writableEnded || res.destroyed) {
        // Leaving the loop runs the cleanup of the events, such as aborting upstream requests.
        break;
      }

      res.write(formatEvent(event));
    }
  } catch (error) {
    const apiResponseError = resolveApiResponseError(error instanceof Error ? error : new Error(String(error)));
    if (apiResponseError.status === StatusCodes.INTERNAL_SERVER_ERROR.valueOf()) {
      logger.error(error);
    }

    if (!res.destroyed) {
      res.write(formatEvent({ event: ERROR_EVENT, data: apiResponseError.getResponsePayload() }));
    }
  } finally {
    res.end();
  }
};
