import { Buffer } from 'node:buffer';
import type { RawData, WebSocket } from 'ws';
import type { Nullable } from '../utils/types.js';
import { ClientMessageSchema } from './messages/client.js';
import type { WSClientMessage } from './messages/client.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';
import type { WebSocketMessageHandler } from './WebSocketMessageHandler.js';

export class WebSocketMessenger {
  private readonly _handler: WebSocketMessageHandler;
  private readonly _socket: WebSocket;

  constructor(socket: WebSocket, handler: WebSocketMessageHandler) {
    this._socket = socket;
    this._handler = handler;
  }

  public get handler(): WebSocketMessageHandler {
    return this._handler;
  }

  public async handleRawIncomingMessage(raw: RawData, isBinary: boolean): Promise<void> {
    const message = isBinary ? null : WebSocketMessenger.parseIncomingMessage(raw);
    if (message === null) {
      throw new WebSocketError('Malformed message received.');
    }

    const result = await this._handler.handle(message);
    if (result !== null) {
      this.send(result);
    }
  }

  public send(message: WSServerMessage): void {
    if (this._socket.readyState === this._socket.OPEN) {
      this._socket.send(JSON.stringify(message));
    }
  }

  private static parseIncomingMessage(raw: RawData): Nullable<WSClientMessage> {
    try {
      const buffer = Array.isArray(raw) ? Buffer.concat(raw) : Buffer.from(new Uint8Array(raw));
      const text = buffer.toString('utf8');
      const result = ClientMessageSchema.safeParse(JSON.parse(text));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
}
