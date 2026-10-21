import { useActiveRuns } from '@components/generation/ActiveRunsContext';
import type { Nullable } from '@core/utils/types';
import type { WorkflowProgress } from '@services/websocket/messages/server';

/**
 * Progress of the given run, null until ComfyUI starts executing it. Kept with the active runs, so a reloaded page shows it right away.
 */
export const useWorkflowProgress = (promptId: string): Nullable<WorkflowProgress> => {
  const runs = useActiveRuns();
  return runs.find((run) => run.promptId === promptId)?.progress ?? null;
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
