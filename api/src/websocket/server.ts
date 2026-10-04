import { Buffer } from 'node:buffer';
import type { Server } from 'node:http';
import { logger } from '@moonstar-x/logger';
import type { RawData, WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { ComfyUiSession } from '../services/comfyui/ComfyUiSession.js';
import { startHeartbeat } from './heartbeat.js';
import type { ClientMessage, ServerMessage } from './messages.js';
import { ClientMessageSchema } from './messages.js';

const WEBSOCKET_PATH = '/ws';

const send = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const parseMessage = (raw: RawData): ClientMessage | null => {
  try {
    const buffer = Array.isArray(raw) ? Buffer.concat(raw) : Buffer.from(new Uint8Array(raw));
    const text = buffer.toString('utf8');
    const result = ClientMessageSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const executeMessage = async (session: ComfyUiSession, message: ClientMessage): Promise<unknown> => {
  switch (message.type) {
    case 'get_history':
      return await session.getHistory(message.data.promptId) ?? null;
    case 'get_queue':
      return await session.getQueue();
    case 'interrupt':
      await session.interrupt();
      return null;
    case 'queue_prompt':
      return await session.queuePrompt(message.data.workflow);
  }
};

const handleMessage = async (socket: WebSocket, session: ComfyUiSession, ip: string, message: ClientMessage): Promise<void> => {
  try {
    const data = await executeMessage(session, message);
    send(socket, { type: 'response', id: message.id, data });
  } catch (error) {
    logger.error(`Failed to handle WebSocket message ${message.type} from ${ip}.`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    send(socket, { type: 'error', id: message.id, data: { message: errorMessage } });
  }
};

const handleConnection = (socket: WebSocket, ip: string): void => {
  const session = new ComfyUiSession({
    onConnectionError: (error): void => {
      logger.error(`ComfyUI connection error for WebSocket client ${ip}.`, error);
      send(socket, { type: 'error', data: { message: 'Could not connect to ComfyUI.' } });
    },
    onConnectionState: (state): void => {
      send(socket, { type: 'connection', data: { state } });
    },
    onMessage: (message): void => {
      send(socket, { type: 'event', data: message });
    },
    onPreview: ({ image }): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(image, { binary: true });
      }
    }
  }).start();

  logger.info(`WebSocket client connected (${ip}) with ComfyUI client ID ${session.clientId}.`);
  send(socket, { type: 'session', data: { clientId: session.clientId } });

  socket.on('message', (raw, isBinary) => {
    const message = isBinary ? null : parseMessage(raw);
    if (!message) {
      send(socket, { type: 'error', data: { message: 'Invalid message received.' } });
      return;
    }

    void handleMessage(socket, session, ip, message);
  });

  socket.on('close', () => {
    session.destroy();
    logger.info(`WebSocket client disconnected (${ip}).`);
  });

  socket.on('error', (error) => {
    logger.error(`WebSocket error for client ${ip}.`, error);
  });
};

export const attachWebSocketServer = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: WEBSOCKET_PATH });
  startHeartbeat(wss);

  wss.on('connection', (socket, req) => {
    handleConnection(socket, req.socket.remoteAddress ?? 'N/A');
  });

  return wss;
};
