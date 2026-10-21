import { useActiveRuns } from '@components/generation/ActiveRunsContext';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { unlockAudio } from '@core/utils/audio';
import type { Nullable } from '@core/utils/types';
import type { RunWorkflowPayload, WorkflowType } from '@services/websocket/messages/client';
import { useCallback, useEffect, useState } from 'react';

type RunState =
  { cancelError: Nullable<string>; isCancelling: boolean; promptId: string; status: 'started' } |
  { error: string; status: 'error' } |
  { promptId: string; status: 'completed' } |
  { status: 'idle' } |
  { status: 'pending' };

const IDLE_STATE: RunState = { status: 'idle' };

const startedState = (promptId: string): RunState => ({ status: 'started', promptId, isCancelling: false, cancelError: null });

export interface UseRunWorkflowParams {
  // Alias of the workflow model, as defined in the API config.
  model: string;
  type: WorkflowType;
}

export interface UseRunWorkflowReturn {
  cancel: () => void;
  /**
   * Why the last cancellation failed, such as the run having finished in the meantime.
   */
  cancelError: Nullable<string>;
  error: Nullable<string>;
  isCancelling: boolean;
  isRunning: boolean;
  isSubmitting: boolean;
  promptId: Nullable<string>;
  reset: () => void;
  run: (payload: RunWorkflowPayload) => void;
}

/**
 * Runs the given workflow and model, null when the page has none to run.
 */
export const useRunWorkflow = (workflow: Nullable<UseRunWorkflowParams>): UseRunWorkflowReturn => {
  const { messenger, isConnected } = useAppWebSocket();
  const runs = useActiveRuns();
  const [state, setState] = useState<RunState>(IDLE_STATE);

  // The server does not correlate responses to requests, so only react to messages while a submission or cancellation is in flight.
  useEffect(() => {
    const settle = (next: RunState): void => {
      setState((previous) => previous.status === 'pending' ? next : previous);
    };
    // Results are tagged with the prompt ID, so only the run this hook follows is settled by them.
    const finish = (promptId: string, next: RunState): void => {
      setState((previous) => previous.status === 'started' && previous.promptId === promptId ? next : previous);
    };

    const unsubscribers = [
      messenger.on('workflow_start', ({ payload }) => {
        settle(startedState(payload.promptId));
      }),
      messenger.on('error', ({ payload }) => {
        settle({ status: 'error', error: payload.message });
        setState((previous) => previous.status === 'started' && previous.isCancelling ? { ...previous, isCancelling: false, cancelError: payload.message } : previous);
      }),
      messenger.on('workflow_complete', ({ payload }) => {
        // The files themselves are recorded by the GenerationSessionProvider.
        finish(payload.promptId, { status: 'completed', promptId: payload.promptId });
      }),
      messenger.on('workflow_error', ({ payload }) => {
        finish(payload.promptId, { status: 'error', error: payload.message });
      }),
      messenger.on('workflow_cancelled', ({ payload }) => {
        finish(payload.promptId, IDLE_STATE);
      })
    ];

    return (): void => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [messenger]);

  if (!isConnected && state.status === 'pending') {
    setState({ status: 'error', error: 'Lost connection to the server before the workflow was queued.' });
  }

  // A started run outlives the connection, the server keeps following it and sends the result once the connection is back.
  // Picks up a run of this workflow and model that is already going, such as one started before a reload or from another tab.
  const runToFollow = state.status === 'pending' || state.status === 'started'
    ? undefined
    : runs.findLast((run) => run.type === workflow?.type && run.model === workflow.model && !(state.status === 'completed' && state.promptId === run.promptId));
  if (runToFollow !== undefined) {
    setState(startedState(runToFollow.promptId));
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

  const runningPromptId = state.status === 'started' ? state.promptId : null;
  const isCancelling = state.status === 'started' && state.isCancelling;

  // The run ends with a workflow_cancelled message once ComfyUI drops it.
  const cancel = useCallback(() => {
    if (!isConnected || runningPromptId === null || isCancelling) {
      return;
    }

    setState((previous) => previous.status === 'started' ? { ...previous, isCancelling: true, cancelError: null } : previous);
    messenger.send({ type: 'cancel_run', payload: { promptId: runningPromptId } });
  }, [isCancelling, isConnected, messenger, runningPromptId]);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  return {
    cancel,
    cancelError: state.status === 'started' ? state.cancelError : null,
    error: state.status === 'error' ? state.error : null,
    isCancelling,
    isRunning: state.status === 'started',
    isSubmitting: state.status === 'pending',
    promptId: state.status === 'completed' ? state.promptId : runningPromptId,
    reset,
    run
  };
};
