import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { unlockAudio } from '@core/utils/audio';
import type { Nullable } from '@core/utils/types';
import type { RunWorkflowPayload } from '@services/websocket/messages/client';
import { useCallback, useEffect, useState } from 'react';

type RunState =
  { error: string; status: 'error' } |
  { promptId: string; status: 'completed' } |
  { promptId: string; status: 'started' } |
  { status: 'idle' } |
  { status: 'pending' };

const IDLE_STATE: RunState = { status: 'idle' };

export interface UseRunWorkflowReturn {
  error: Nullable<string>;
  isRunning: boolean;
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
    // Results are tagged with the prompt ID, so only the run this hook started is settled by them.
    const finish = (promptId: string, next: RunState): void => {
      setState((previous) => previous.status === 'started' && previous.promptId === promptId ? next : previous);
    };

    const unsubscribeStart = messenger.on('workflow_start', ({ payload }) => {
      settle({ status: 'started', promptId: payload.promptId });
    });
    const unsubscribeError = messenger.on('error', ({ payload }) => {
      settle({ status: 'error', error: payload.message });
    });
    const unsubscribeComplete = messenger.on('workflow_complete', ({ payload }) => {
      // The files themselves are recorded by the GenerationSessionProvider.
      finish(payload.promptId, { status: 'completed', promptId: payload.promptId });
    });
    const unsubscribeWorkflowError = messenger.on('workflow_error', ({ payload }) => {
      finish(payload.promptId, { status: 'error', error: payload.message });
    });

    return (): void => {
      unsubscribeStart();
      unsubscribeError();
      unsubscribeComplete();
      unsubscribeWorkflowError();
    };
  }, [messenger]);

  if (!isConnected && state.status === 'pending') {
    setState({ status: 'error', error: 'Lost connection to the server before the workflow was queued.' });
  }

  // The server stops tracking the run when the connection closes, so its result would never arrive.
  if (!isConnected && state.status === 'started') {
    setState({ status: 'error', error: 'Lost connection to the server before the workflow finished.' });
  }

  const run = useCallback((payload: RunWorkflowPayload) => {
    if (!isConnected) {
      setState({ status: 'error', error: 'Not connected to the server.' });
      return;
    }

    // Runs start from a click, which is the gesture the completion sound needs to play once the user has gone elsewhere.
    void unlockAudio();
    setState({ status: 'pending' });
    messenger.send({ type: 'run_workflow', payload });
  }, [isConnected, messenger]);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  return {
    error: state.status === 'error' ? state.error : null,
    isRunning: state.status === 'started',
    isSubmitting: state.status === 'pending',
    promptId: state.status === 'started' || state.status === 'completed' ? state.promptId : null,
    reset,
    run
  };
};
