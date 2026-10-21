import { WS_URL } from '@core/config/environment';
import type { Nullable } from '@core/utils/types';
import { SESSION_ERROR_CODES } from '@services/api/client';
import { setSession } from '@services/auth/session';
import { WebSocketMessenger } from '@services/websocket/WebSocketMessenger';
import { createContext, use, useEffect, useMemo, useState } from 'react';
import type { Context, FC, ReactNode } from 'react';
import { ReadyState } from 'react-use-websocket/dist/lib/constants';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';

const RECONNECT_ATTEMPTS = 20;
const MAX_RECONNECT_INTERVAL_MS = 10_000;

const getReconnectInterval = (attempt: number): number => Math.min(1000 * (2 ** attempt), MAX_RECONNECT_INTERVAL_MS);

interface ContextValue {
  clientId: Nullable<string>;
  isConnected: boolean;
  messenger: WebSocketMessenger;
  readyState: ReadyState;
}

const WebSocketContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

interface Props {
  children: ReactNode;
}

export const WebSocketProvider: FC<Props> = ({ children }) => {
  const [messenger] = useState<WebSocketMessenger>(() => new WebSocketMessenger());
  const [clientId, setClientId] = useState<Nullable<string>>(null);
  const { readyState, sendMessage } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectAttempts: RECONNECT_ATTEMPTS,
    reconnectInterval: getReconnectInterval,
    onMessage: (event) => {
      messenger.handleRawIncomingMessage(event.data);
    },
    onClose: () => {
      setClientId(null);
    }
  });

  useEffect(() => {
    messenger.attach(sendMessage);
    return (): void => {
      messenger.detach();
    };
  }, [messenger, sendMessage]);

  useEffect(() => messenger.on('session', (message) => {
    setClientId(message.payload.clientId);
  }), [messenger]);

  // Same as the API client, a rejected token sends the user back to the login page.
  useEffect(() => messenger.on('error', ({ payload }) => {
    if (payload.code !== undefined && SESSION_ERROR_CODES.has(payload.code)) {
      setSession(null);
    }
  }), [messenger]);

  const context = useMemo<ContextValue>(() => ({
    clientId,
    isConnected: readyState === ReadyState.OPEN,
    messenger,
    readyState
  }), [clientId, messenger, readyState]);

  return (
    <WebSocketContext value={context}>
      {children}
    </WebSocketContext>
  );
};

export const useAppWebSocket = (): ContextValue => {
  const context = use(WebSocketContext);
  if (context === null) {
    throw new Error('You must call useAppWebSocket inside of a WebSocketProvider.');
  }

  return context;
};
