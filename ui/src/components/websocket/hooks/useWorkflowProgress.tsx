import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable } from '@core/utils/types';
import type { WorkflowProgress } from '@services/websocket/messages/server';
import { useEffect, useState } from 'react';

interface TrackedProgress {
  progress: WorkflowProgress;
  promptId: string;
}

/**
 * Progress of the given run, null until ComfyUI starts executing it.
 */
export const useWorkflowProgress = (promptId: string): Nullable<WorkflowProgress> => {
  const { messenger } = useAppWebSocket();
  const [tracked, setTracked] = useState<Nullable<TrackedProgress>>(null);

  useEffect(() => messenger.on('workflow_progress', ({ payload: { promptId: messagePromptId, ...progress } }) => {
    if (messagePromptId === promptId) {
      setTracked({ promptId: messagePromptId, progress });
    }
  }), [messenger, promptId]);

  // Progress left over from a previous run is ignored rather than reset in the effect.
  return tracked?.promptId === promptId ? tracked.progress : null;
};

/**
 * Fraction (0-1) of the run that is done, counting the steps of the node currently executing as part of it.
 */
export const getWorkflowProgressFraction = ({ completed, step, total }: WorkflowProgress): number => {
  if (total <= 0) {
    return 0;
  }

  const stepFraction = step !== null && step.max > 0 ? step.value / step.max : 0;
  return Math.min((completed + stepFraction) / total, 1);
};
