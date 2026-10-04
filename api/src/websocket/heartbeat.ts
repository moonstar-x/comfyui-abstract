import type { WebSocket, WebSocketServer } from 'ws';

const HEARTBEAT_INTERVAL_MS = 30_000;

export const startHeartbeat = (wss: WebSocketServer): void => {
  const aliveSockets = new WeakSet<WebSocket>();

  wss.on('connection', (socket) => {
    aliveSockets.add(socket);
    socket.on('pong', () => {
      aliveSockets.add(socket);
    });
  });

  const interval = setInterval(() => {
    for (const socket of wss.clients) {
      if (!aliveSockets.has(socket)) {
        socket.terminate();
        continue;
      }

      aliveSockets.delete(socket);
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(interval);
  });
};
