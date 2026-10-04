import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { createLogger } from '@moonstar-x/logger';
import { WebSocketServer as NodeWebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { WebSocketConnection } from './WebSocketConnection.js';
import { WebSocketHeartbeat } from './WebSocketHeartbeat.js';
import { WebSocketMessageHandler } from './WebSocketMessageHandler.js';
import { WebSocketMessenger } from './WebSocketMessenger.js';

const WEBSOCKET_PATH = '/ws';

export interface WebSocketServerOptions {
  heartbeat: WebSocketHeartbeat;
}

export class WebSocketServer {
  private readonly _connections: WeakSet<WebSocketConnection>;
  private readonly _wss: NodeWebSocketServer;

  constructor(wss: NodeWebSocketServer, options: WebSocketServerOptions) {
    this._wss = wss;
    this._connections = new WeakSet();
    this.initialize(options.heartbeat);
  }

  private handleConnection(socket: WebSocket, req: IncomingMessage): void {
    const connection = new WebSocketConnection(socket, {
      ip: req.socket.remoteAddress ?? 'N/A',
      messenger: new WebSocketMessenger(socket, new WebSocketMessageHandler()),
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
  }

  public static create(httpServer: HttpServer): WebSocketServer {
    const wss = new NodeWebSocketServer({ server: httpServer, path: WEBSOCKET_PATH });
    const heartbeat = new WebSocketHeartbeat(wss);

    return new WebSocketServer(wss, { heartbeat });
  }
}
