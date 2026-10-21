import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable } from '@core/utils/types';
import { useCallback, useEffect, useState } from 'react';

const FREED_RESET_DELAY_MS = 3000;

type FreeMemoryState =
  { error: string; status: 'error' } |
  { status: 'freed' } |
  { status: 'idle' } |
  { status: 'pending' };

const IDLE_STATE: FreeMemoryState = { status: 'idle' };

export interface UseFreeComfyUiMemoryReturn {
  error: Nullable<string>;
  free: () => void;
  isFreed: boolean;
  isFreeing: boolean;
}

export const useFreeComfyUiMemory = (onFreed?: () => void): UseFreeComfyUiMemoryReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const [state, setState] = useState<FreeMemoryState>(IDLE_STATE);

  // The server does not correlate responses to requests, so only react to messages while a request is in flight.
  useEffect(() => {
    const settle = (next: FreeMemoryState): void => {
      setState((previous) => previous.status === 'pending' ? next : previous);
    };

    const unsubscribeFreed = messenger.on('comfyui_memory_freed', () => {
      settle({ status: 'freed' });
    });
    const unsubscribeError = messenger.on('error', ({ payload }) => {
      settle({ status: 'error', error: payload.message });
    });

    return (): void => {
      unsubscribeFreed();
      unsubscribeError();
    };
  }, [messenger]);

  useEffect(() => {
    if (state.status !== 'freed') {
      return;
    }

    onFreed?.();
    const handle = setTimeout(() => {
      setState(IDLE_STATE);
    }, FREED_RESET_DELAY_MS);
    return (): void => {
      clearTimeout(handle);
    };
  }, [state.status, onFreed]);

  if (!isConnected && state.status === 'pending') {
    setState({ status: 'error', error: 'Lost connection to the server before the memory was freed.' });
  }

  const free = useCallback(() => {
    if (!isConnected) {
      setState({ status: 'error', error: 'Not connected to the server.' });
      return;
    }

    setState({ status: 'pending' });
    messenger.send({ type: 'comfyui_free_up_memory' });
  }, [isConnected, messenger]);

  return {
    error: state.status === 'error' ? state.error : null,
    free,
    isFreed: state.status === 'freed',
    isFreeing: state.status === 'pending'
  };
};
