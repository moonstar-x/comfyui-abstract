import { EventEmitter } from 'node:events';
import type { Logger } from '@moonstar-x/logger';
import type { RawData, WebSocket } from 'ws';
import { ComfyUiClientSession } from '../services/comfyui/ComfyUiClientSession.js';
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

  public start(): void {
    const comfyUiSession = ComfyUiClientSession.create().start();
    // TODO: Session should register lifecycle events.
    // const session = new ComfyUiSession({
    //   onConnectionError: (error): void => {
    //     logger.error(`ComfyUI connection error for WebSocket client ${ip}.`, error);
    //     send(socket, { type: 'error', data: { message: 'Could not connect to ComfyUI.' } });
    //   },
    //   onConnectionState: (state): void => {
    //     send(socket, { type: 'connection', data: { state } });
    //   },
    //   onMessage: (message): void => {
    //     send(socket, { type: 'event', data: message });
    //   },
    //   onPreview: ({ image }): void => {
    //     if (socket.readyState === socket.OPEN) {
    //       socket.send(image, { binary: true });
    //     }
    //   }
    // }).start();

    this._messenger.handler.setComfyUiSession(comfyUiSession);

    this._logger.info(`WebSocket client connected with ComfyUI client ID: ${comfyUiSession.clientId}`);
    this._messenger.send({ type: 'session', payload: { clientId: comfyUiSession.clientId } });

    this._socket.on('message', (raw, isBinary) => {
      void this.handleMessage(raw, isBinary);
    });

    this._socket.on('close', () => {
      comfyUiSession.destroy();
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
