import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { WSClientMessage } from '@services/websocket/messages/client';
import { useCallback, useEffect, useRef } from 'react';

export type UseSendOnConnectReturn = () => void;

export const useSendOnConnect = (message: WSClientMessage): UseSendOnConnectReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const hasSentRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isConnected) {
      hasSentRef.current = false;
      return;
    }

    if (hasSentRef.current) {
      return;
    }

    hasSentRef.current = true;
    messenger.send(message);
  }, [isConnected, message, messenger]);

  return useCallback(() => {
    if (isConnected) {
      messenger.send(message);
    }
  }, [isConnected, message, messenger]);
};
