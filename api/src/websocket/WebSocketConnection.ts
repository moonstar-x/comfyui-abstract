import { EventEmitter } from 'node:events';
import type { Logger } from '@moonstar-x/logger';
import type { RawData, WebSocket } from 'ws';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';
import type { WebSocketMessenger } from './WebSocketMessenger.js';

export interface WebSocketConnectionEvents {
  close: [];
}

export interface WebSocketConnectionOptions {
  ip: string;
  logger: Logger;
  messenger: WebSocketMessenger;
}

export class WebSocketConnection extends EventEmitter<WebSocketConnectionEvents> {
  private readonly _logger: Logger;
  private readonly _messenger: WebSocketMessenger;
  private readonly _socket: WebSocket;

  constructor(socket: WebSocket, options: WebSocketConnectionOptions) {
    super();
    this._socket = socket;
    this._logger = options.logger.child(options.ip);
    this._messenger = options.messenger;
  }

  public get username(): null | string {
    return this._messenger.username;
  }

  public send(message: WSServerMessage): void {
    this._messenger.send(message);
  }

  public start(): void {
    this._logger.info('WebSocket client connected.');

    this._socket.on('message', (raw, isBinary) => {
      void this.handleMessage(raw, isBinary);
    });

    this._socket.on('close', () => {
      this._logger.info('WebSocket client disconnected.');
      this.emit('close');
    });

    this._socket.on('error', (error) => {
      this._logger.error('WebSocket error:', error);
    });
  }

  private async handleMessage(raw: RawData, isBinary: boolean): Promise<void> {
    try {
      await this._messenger.handleRawIncomingMessage(raw, isBinary);
    } catch (error) {
      this._logger.error(error);
      const wsError = error instanceof WebSocketError ? error : new WebSocketError(error instanceof Error ? error.message : 'An unknown error occurred.');
      this._messenger.send(wsError.toWSServerMessage());
    }
  }
}
