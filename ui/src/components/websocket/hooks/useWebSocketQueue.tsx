import { useSendOnConnect } from '@components/websocket/hooks/useSendOnConnect';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable, Optional } from '@core/utils/types';
import type { WSClientMessage } from '@services/websocket/messages/client';
import type { QueueJobStatus } from '@services/websocket/messages/server';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_QUEUE_POLL_INTERVAL_MS = 5000;

export interface QueueState {
  pending: number;
  running: number;
  size: number;
}

export interface UseQueueParams {
  interval?: Optional<number>;
  promptId?: Optional<string>;
}

export interface UseQueueReturn {
  job: Nullable<QueueJobStatus>;
  queue: Nullable<QueueState>;
  refresh: () => void;
}

export const useWebSocketQueue = ({ interval = DEFAULT_QUEUE_POLL_INTERVAL_MS, promptId }: UseQueueParams = {}): UseQueueReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const [queue, setQueue] = useState<Nullable<QueueState>>(null);
  const [job, setJob] = useState<Nullable<QueueJobStatus>>(null);
  const message = useMemo<WSClientMessage>(() => promptId === undefined ? { type: 'get_queue' } : { type: 'get_queue', payload: { promptId } }, [promptId]);
  const requestQueue = useSendOnConnect(message);

  useEffect(() => messenger.on('queue', ({ payload }) => {
    setQueue({ pending: payload.pending, running: payload.running, size: payload.size });
    // Responses for other hook instances share the same message type, only keep the job this hook asked for.
    setJob(promptId !== undefined && payload.job?.promptId === promptId ? payload.job : null);
  }), [messenger, promptId]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handle = setInterval(requestQueue, interval);
    return (): void => {
      clearInterval(handle);
    };
  }, [isConnected, requestQueue, interval]);

  return { queue, job, refresh: requestQueue };
};
