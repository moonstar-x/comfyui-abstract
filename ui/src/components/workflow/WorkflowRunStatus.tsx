import { useWebSocketQueue } from '@components/websocket/hooks/useWebSocketQueue';
import { getWorkflowProgressFraction, useWorkflowProgress } from '@components/websocket/hooks/useWorkflowProgress';
import type { WorkflowProgress } from '@services/websocket/messages/server';
import { ListOrdered, LoaderCircle } from 'lucide-react';
import type { FC } from 'react';

const JOB_POLL_INTERVAL_MS = 2000;

interface ProgressBarProps {
  progress: WorkflowProgress;
}

// The native element is restyled through its vendor pseudo-elements, Chromium and Safari share the WebKit ones.
const PROGRESS_CLASSES = [
  'h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-primary/15',
  '[&::-webkit-progress-bar]:bg-transparent',
  '[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300',
  '[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary'
].join(' ');

const ProgressBar: FC<ProgressBarProps> = ({ progress }) => {
  const percentage = Math.round(getWorkflowProgressFraction(progress) * 100);
  const { step } = progress;

  return (
    <div className="flex w-64 max-w-full flex-col gap-1.5">
      <progress aria-label="Workflow progress" className={PROGRESS_CLASSES} max={100} value={percentage} />
      <span className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{`${percentage.toString()}%`}</span>
        {step !== null && <span>{`Step ${step.value.toString()} of ${step.max.toString()}`}</span>}
      </span>
    </div>
  );
};

export interface WorkflowRunStatusProps {
  promptId: string;
}

export const WorkflowRunStatus: FC<WorkflowRunStatusProps> = ({ promptId }) => {
  const { job } = useWebSocketQueue({ promptId, interval: JOB_POLL_INTERVAL_MS });
  const progress = useWorkflowProgress(promptId);
  // Progress events arrive as soon as the run starts, before the next queue poll reports it as processing.
  const isProcessing = progress !== null || job?.processing === true;

  let label: string;
  if (isProcessing) {
    label = 'Running in ComfyUI…';
  } else if (job === null) {
    label = 'Submitted. Waiting for ComfyUI…';
  } else {
    label = `Queued at position ${job.position.toString()}.`;
  }

  return (
    <output aria-live="polite" className="flex max-w-full min-w-0 flex-col items-center gap-3 text-sm">
      <span className="flex items-center gap-2 font-medium text-foreground">
        {isProcessing
          ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
          : <ListOrdered aria-hidden="true" className="size-4 text-muted-foreground" />}
        {label}
      </span>
      {progress !== null && <ProgressBar progress={progress} />}
    </output>
  );
};
