import type { WebSocket, WebSocketServer } from 'ws';

const HEARTBEAT_INTERVAL_MS = 30_000;

export class WebSocketHeartbeat {
  private readonly _aliveSockets: WeakSet<WebSocket>;
  private readonly _wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this._wss = wss;
    this._aliveSockets = new WeakSet();
  }

  public start(): void {
    this._wss.on('connection', (socket) => {
      this._aliveSockets.add(socket);
      socket.on('pong', () => {
        this._aliveSockets.add(socket);
      });
    });

    const interval = setInterval(() => {
      for (const socket of this._wss.clients) {
        if (!this._aliveSockets.has(socket)) {
          socket.terminate();
          continue;
        }

        this._aliveSockets.delete(socket);
        socket.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);

    this._wss.on('close', () => {
      clearInterval(interval);
    });
  }
}
