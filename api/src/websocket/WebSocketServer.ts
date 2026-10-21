import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { createLogger } from '@moonstar-x/logger';
import { WebSocketServer as NodeWebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { ComfyUiClientSession } from '../services/comfyui/ComfyUiClientSession.js';
import type { GenerationJobTracker } from '../services/generations/GenerationJobTracker.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketConnection } from './WebSocketConnection.js';
import { WebSocketHeartbeat } from './WebSocketHeartbeat.js';
import { WebSocketMessageHandler } from './WebSocketMessageHandler.js';
import { WebSocketMessenger } from './WebSocketMessenger.js';

export const WEBSOCKET_PATH = '/ws';
// Messages only carry params and upload references, files go through POST /api/uploads, so anything bigger is rejected before it's buffered.
const MAX_MESSAGE_BYTES = 1024 * 1024;
// The endpoint is going away, such as a server shutting down. Tells the client it may reconnect later.
const GOING_AWAY_CLOSE_CODE = 1001;

export interface WebSocketServerServices {
  comfyUi: ComfyUiClientSession;
  jobTracker: GenerationJobTracker;
}

export interface WebSocketServerOptions extends WebSocketServerServices {
  heartbeat: WebSocketHeartbeat;
}

export class WebSocketServer {
  private readonly _connections: Set<WebSocketConnection>;
  private readonly _handler: WebSocketMessageHandler;
  private readonly _jobTracker: GenerationJobTracker;
  private readonly _wss: NodeWebSocketServer;

  /**
   * Every connection of the user gets the updates of their runs, so any of their tabs can follow a run.
   */
  private readonly sendToUser = (username: string, message: WSServerMessage): void => {
    for (const connection of this._connections) {
      if (connection.username === username) {
        connection.send(message);
      }
    }
  };

  constructor(wss: NodeWebSocketServer, options: WebSocketServerOptions) {
    this._wss = wss;
    this._connections = new Set();
    this._handler = new WebSocketMessageHandler({ comfyUi: options.comfyUi, jobTracker: options.jobTracker });
    this._jobTracker = options.jobTracker;
    this.initialize(options.heartbeat);
  }

  /**
   * Stops accepting connections and asks every client to disconnect with a going away close code.
   * Clients that do not complete the closing handshake stay open, so call terminate() if they must be dropped.
   */
  public close(): void {
    this._jobTracker.off('message', this.sendToUser);

    for (const socket of this._wss.clients) {
      socket.close(GOING_AWAY_CLOSE_CODE, 'Server is shutting down.');
    }

    this._wss.close();
  }

  /**
   * Drops every client immediately, without waiting for the closing handshake.
   */
  public terminate(): void {
    for (const socket of this._wss.clients) {
      socket.terminate();
    }
  }

  private handleConnection(socket: WebSocket, req: IncomingMessage): void {
    const connection = new WebSocketConnection(socket, {
      ip: req.socket.remoteAddress ?? 'N/A',
      messenger: new WebSocketMessenger(socket, this._handler),
      logger: createLogger({
        name: 'WebSocketMessenger'
      })
    });
    connection.start();

    this._connections.add(connection);
    connection.on('close', () => {
      this._connections.delete(connection);
    });
  }

  private initialize(heartbeat: WebSocketHeartbeat): void {
    heartbeat.start();
    this._wss.on('connection', (socket, req) => this.handleConnection(socket, req));
    this._jobTracker.on('message', this.sendToUser);
  }

  public static create(httpServer: HttpServer, services: WebSocketServerServices): WebSocketServer {
    const wss = new NodeWebSocketServer({ server: httpServer, path: WEBSOCKET_PATH, maxPayload: MAX_MESSAGE_BYTES });
    const heartbeat = new WebSocketHeartbeat(wss);

    return new WebSocketServer(wss, { ...services, heartbeat });
  }
}
