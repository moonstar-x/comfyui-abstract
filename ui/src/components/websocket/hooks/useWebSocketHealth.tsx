import { useSendOnConnect } from '@components/websocket/hooks/useSendOnConnect';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable, Optional } from '@core/utils/types';
import type { WSClientMessage } from '@services/websocket/messages/client';
import { useEffect, useState } from 'react';

const DEFAULT_HEALTH_POLL_INTERVAL_MS = 10_000;
const GET_HEALTH_MESSAGE: WSClientMessage = { type: 'get_health' };

export interface UseHealthParams {
  interval?: Optional<number>;
}

export interface UseHealthReturn {
  online: Nullable<boolean>;
}

export const useWebSocketHealth = ({ interval = DEFAULT_HEALTH_POLL_INTERVAL_MS }: UseHealthParams = {}): UseHealthReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const [online, setOnline] = useState<Nullable<boolean>>(null);
  const requestHealth = useSendOnConnect(GET_HEALTH_MESSAGE);

  useEffect(() => messenger.on('health', (message) => {
    setOnline(message.payload.online);
  }), [messenger]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handle = setInterval(requestHealth, interval);
    return (): void => {
      clearInterval(handle);
    };
  }, [isConnected, requestHealth, interval]);

  return { online };
};
