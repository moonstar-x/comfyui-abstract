import { Buffer } from 'node:buffer';
import type { RawData, WebSocket } from 'ws';
import { z } from 'zod';
import { ErrorCodes } from '../app/http/errors/ErrorCodes.js';
import { authenticateToken, InvalidSessionError } from '../services/auth/session.js';
import type { AuthenticatedUser } from '../services/auth/session.js';
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

    let user: AuthenticatedUser;
    try {
      user = await WebSocketMessenger.authenticate(message.token);
    } catch (error) {
      // Stops pushing the run updates of the previous user to a connection whose token is no longer accepted.
      this._username = null;
      throw error;
    }

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

  private static async authenticate(token: string): Promise<AuthenticatedUser> {
    if (token === '') {
      throw new WebSocketError('No authorization token was provided.', { code: ErrorCodes.SESSION_NOT_PROVIDED });
    }

    // Checked against the database on every message, like an HTTP request, so a revoked token or deleted user loses access right away.
    try {
      return await authenticateToken(token);
    } catch (error) {
      if (error instanceof InvalidSessionError) {
        throw new WebSocketError(error.message, { code: ErrorCodes.SESSION_INVALID, cause: error });
      }

      throw error;
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
