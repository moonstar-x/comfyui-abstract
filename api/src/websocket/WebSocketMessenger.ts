import { Buffer } from 'node:buffer';
import type { RawData, WebSocket } from 'ws';
import { z } from 'zod';
import { ErrorCodes } from '../app/http/errors/ErrorCodes.js';
import { verifyToken } from '../services/auth/token.js';
import type { TokenPayload } from '../services/auth/token.js';
import { AuthenticatedClientMessageSchema } from './messages/client.js';
import type { WSAuthenticatedClientMessage } from './messages/client.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';
import type { WebSocketMessageHandler } from './WebSocketMessageHandler.js';

export class WebSocketMessenger {
  private readonly _handler: WebSocketMessageHandler;
  private readonly _socket: WebSocket;
  private _username: null | string = null;

  constructor(socket: WebSocket, handler: WebSocketMessageHandler) {
    this._socket = socket;
    this._handler = handler;
  }

  /**
   * The user of the last authenticated message, whose runs are sent to this connection. Null until the client sends one.
   */
  public get username(): null | string {
    return this._username;
  }

  public async handleRawIncomingMessage(raw: RawData, isBinary: boolean): Promise<void> {
    const message = isBinary ? null : WebSocketMessenger.parseIncomingMessage(raw);
    if (message === null) {
      throw new WebSocketError('Malformed message received.');
    }

    const user = await WebSocketMessenger.authenticate(message.token);
    // Set before the message is handled, so the connection already gets the updates of a run it queues.
    this._username = user.username;
    const results = await this._handler.handle(message, user);
    for (const result of results) {
      this.send(result);
    }
  }

  public send(message: WSServerMessage): void {
    if (this._socket.readyState === this._socket.OPEN) {
      this._socket.send(JSON.stringify(message));
    }
  }

  private static async authenticate(token: string): Promise<TokenPayload> {
    if (token === '') {
      throw new WebSocketError('No authorization token was provided.', { code: ErrorCodes.SESSION_NOT_PROVIDED });
    }

    // Only the token itself is checked to avoid a database query per message, so a deleted user keeps access until the token expires.
    try {
      return await verifyToken(token);
    } catch (error) {
      throw new WebSocketError('The provided token is invalid or has expired.', { code: ErrorCodes.SESSION_INVALID, cause: error });
    }
  }

  private static parseIncomingMessage(raw: RawData): WSAuthenticatedClientMessage {
    try {
      const buffer = Array.isArray(raw) ? Buffer.concat(raw) : Buffer.from(new Uint8Array(raw));
      const text = buffer.toString('utf8');
      const result = AuthenticatedClientMessageSchema.safeParse(JSON.parse(text));
      if (!result.success) {
        throw new WebSocketError(`Malformed message received. ${z.prettifyError(result.error)}`);
      }

      return result.data;
    } catch (error) {
      if (error instanceof WebSocketError) {
        throw error;
      }

      throw new WebSocketError('Malformed message received. Could not parse incoming message, is it JSON?');
    }
  }
}
