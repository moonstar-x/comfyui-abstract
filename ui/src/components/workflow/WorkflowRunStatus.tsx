import { useWebSocketQueue } from '@components/websocket/hooks/useWebSocketQueue';
import { ListOrdered, LoaderCircle } from 'lucide-react';
import type { FC } from 'react';

const JOB_POLL_INTERVAL_MS = 2000;

export interface WorkflowRunStatusProps {
  promptId: string;
}

export const WorkflowRunStatus: FC<WorkflowRunStatusProps> = ({ promptId }) => {
  const { job } = useWebSocketQueue({ promptId, interval: JOB_POLL_INTERVAL_MS });

  let label: string;
  if (job === null) {
    label = 'Submitted. Waiting for ComfyUI…';
  } else if (job.processing) {
    label = 'Running in ComfyUI…';
  } else {
    label = `Queued at position ${job.position.toString()}.`;
  }

  return (
    <output aria-live="polite" className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <span className="flex items-center gap-2 font-medium">
        {job?.processing === true
          ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
          : <ListOrdered aria-hidden="true" className="size-4 text-muted-foreground" />}
        {label}
      </span>
      <span className="truncate font-mono text-xs text-muted-foreground">{promptId}</span>
    </output>
  );
};
