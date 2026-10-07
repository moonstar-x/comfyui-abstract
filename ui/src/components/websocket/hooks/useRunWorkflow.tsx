import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable } from '@core/utils/types';
import type { RunWorkflowPayload } from '@services/websocket/messages/client';
import { useCallback, useEffect, useState } from 'react';

type RunState =
  { error: string; status: 'error' } |
  { promptId: string; status: 'started' } |
  { status: 'idle' } |
  { status: 'pending' };

const IDLE_STATE: RunState = { status: 'idle' };

export interface UseRunWorkflowReturn {
  error: Nullable<string>;
  isSubmitting: boolean;
  promptId: Nullable<string>;
  reset: () => void;
  run: (payload: RunWorkflowPayload) => void;
}

export const useRunWorkflow = (): UseRunWorkflowReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const [state, setState] = useState<RunState>(IDLE_STATE);

  // The server does not correlate responses to requests, so only react to messages while a submission is in flight.
  useEffect(() => {
    const settle = (next: RunState): void => {
      setState((previous) => previous.status === 'pending' ? next : previous);
    };

    const unsubscribeStart = messenger.on('workflow_start', ({ payload }) => {
      settle({ status: 'started', promptId: payload.promptId });
    });
    const unsubscribeError = messenger.on('error', ({ payload }) => {
      settle({ status: 'error', error: payload.message });
    });

    return (): void => {
      unsubscribeStart();
      unsubscribeError();
    };
  }, [messenger]);

  if (!isConnected && state.status === 'pending') {
    setState({ status: 'error', error: 'Lost connection to the server before the workflow was queued.' });
  }

  const run = useCallback((payload: RunWorkflowPayload) => {
    if (!isConnected) {
      setState({ status: 'error', error: 'Not connected to the server.' });
      return;
    }

    setState({ status: 'pending' });
    messenger.send({ type: 'run_workflow', payload });
  }, [isConnected, messenger]);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  return {
    error: state.status === 'error' ? state.error : null,
    isSubmitting: state.status === 'pending',
    promptId: state.status === 'started' ? state.promptId : null,
    reset,
    run
  };
};
