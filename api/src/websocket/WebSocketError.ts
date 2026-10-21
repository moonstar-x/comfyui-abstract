import type { ErrorCode } from '../app/http/errors/ErrorCodes.js';
import type { WSServerMessage } from './messages/server.js';

export interface WebSocketErrorOptions extends ErrorOptions {
  code?: ErrorCode | undefined;
}

export class WebSocketError extends Error {
  public readonly code: ErrorCode | undefined;

  constructor(message: string, options: WebSocketErrorOptions = {}) {
    super(message, options);
    this.name = 'WebSocketError';
    this.code = options.code;
  }

  public toWSServerMessage(): WSServerMessage {
    return { type: 'error', payload: this.code === undefined ? { message: this.message } : { message: this.message, code: this.code } };
  }
}
