import { useSendOnConnect } from '@components/websocket/hooks/useSendOnConnect';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable, Optional } from '@core/utils/types';
import type { WSClientMessage } from '@services/websocket/messages/client';
import type { SystemUsage } from '@services/websocket/messages/server';
import { useEffect, useState } from 'react';

const DEFAULT_STATUS_POLL_INTERVAL_MS = 10_000;
const GET_STATUS_MESSAGE: WSClientMessage = { type: 'get_status' };

export interface UseStatusParams {
  interval?: Optional<number>;
}

export interface UseStatusReturn {
  online: Nullable<boolean>;
  refresh: () => void;
  usage: Nullable<SystemUsage>;
}

export const useWebSocketStatus = ({ interval = DEFAULT_STATUS_POLL_INTERVAL_MS }: UseStatusParams = {}): UseStatusReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const [online, setOnline] = useState<Nullable<boolean>>(null);
  const [usage, setUsage] = useState<Nullable<SystemUsage>>(null);
  const requestStatus = useSendOnConnect(GET_STATUS_MESSAGE);

  useEffect(() => messenger.on('status', (message) => {
    setOnline(message.payload.online);
    setUsage(message.payload.usage);
  }), [messenger]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handle = setInterval(requestStatus, interval);
    return (): void => {
      clearInterval(handle);
    };
  }, [isConnected, requestStatus, interval]);

  return { online, usage, refresh: requestStatus };
};
