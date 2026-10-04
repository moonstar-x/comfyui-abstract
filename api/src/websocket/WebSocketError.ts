import type { WSServerMessage } from './messages/server.js';

export class WebSocketError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = 'WebSocketError';
  }

  public toWSServerMessage(): WSServerMessage {
    return { type: 'error', payload: { message: this.message } };
  }
}
