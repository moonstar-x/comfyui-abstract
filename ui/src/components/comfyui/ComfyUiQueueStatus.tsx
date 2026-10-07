import { Button } from '@components/ui/third-party/shadcn/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/third-party/shadcn/tooltip';
import type { QueueState } from '@components/websocket/hooks/useWebSocketQueue';
import { cn } from 'cn';
import { ListOrdered } from 'lucide-react';
import type { FC } from 'react';

const formatJobCount = (count: number): string => `${count.toString()} ${count === 1 ? 'job' : 'jobs'}`;

const getQueueDescription = ({ size, running, pending }: QueueState): string => {
  if (size === 0) {
    return 'The ComfyUI queue is empty. Click to check again.';
  }

  return `${running.toString()} running, ${pending.toString()} pending. Click to check again.`;
};

export interface ComfyUiQueueStatusProps {
  onRefresh: () => void;
  queue: QueueState;
}

export const ComfyUiQueueStatus: FC<ComfyUiQueueStatusProps> = ({ queue, onRefresh }) => {
  const isProcessing = queue.running > 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            aria-label={`ComfyUI queue: ${formatJobCount(queue.size)}`}
            className="gap-1.5 rounded-full px-3 text-xs"
            variant="outline"
            onClick={onRefresh}
          />
        )}
      >
        <span className="relative flex">
          <ListOrdered aria-hidden="true" className="size-3.5 text-muted-foreground" />
          {isProcessing && <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 size-1.5 animate-pulse rounded-full bg-status-online" />}
        </span>
        <span className="hidden font-medium text-muted-foreground md:inline">Queue</span>
        <span aria-live="polite" className={cn('min-w-[1ch] font-medium tabular-nums', queue.size === 0 && 'text-muted-foreground')}>
          {queue.size}
        </span>
      </TooltipTrigger>
      <TooltipContent align="end" side="bottom">{getQueueDescription(queue)}</TooltipContent>
    </Tooltip>
  );
};
