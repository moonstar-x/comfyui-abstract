import { AudioPlayer } from '@components/audio/AudioPlayer';
import type { AudioPlayerProps } from '@components/audio/AudioPlayer';
import { useDeleteGeneration } from '@components/history/hooks/useGenerations';
import { CATEGORY_TILE_CLASSES, findWorkflowNavItem } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { Button } from '@components/ui/third-party/shadcn/button';
import { formatDuration, formatParamValue } from '@core/generations/generations';
import type { GenerationRecord } from '@core/generations/generations';
import type { Nullable } from '@core/utils/types';
import { cn } from 'cn';
import { ChevronDown, Clock, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

const getQueueWaitMs = (generation: GenerationRecord): Nullable<number> => generation.startedAt === null
  ? null
  : new Date(generation.startedAt).getTime() - new Date(generation.createdAt).getTime();

interface DurationTextProps {
  className?: string;
  durationMs: number;
  queueWaitMs: Nullable<number>;
}

export const DurationText: FC<DurationTextProps> = ({ className, durationMs, queueWaitMs }) => {
  const title = queueWaitMs === null
    ? undefined
    : `Waited ${formatDuration(queueWaitMs)} in the queue, ran for ${formatDuration(durationMs - queueWaitMs)}`;

  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)} title={title}>
      <Clock aria-hidden="true" className="size-3.5" />
      {formatDuration(durationMs)}
    </span>
  );
};

export const DurationLabel: FC<{ generation: GenerationRecord }> = ({ generation }) => (
  <DurationText durationMs={generation.durationMs} queueWaitMs={getQueueWaitMs(generation)} />
);

export const WorkflowBadge: FC<{ generation: GenerationRecord }> = ({ generation }) => {
  const navItem = findWorkflowNavItem(generation.workflowType);

  return (
    <Badge className={cn(navItem === null ? undefined : CATEGORY_TILE_CLASSES[navItem.category])} variant={navItem === null ? 'secondary' : 'default'}>
      {navItem?.title ?? generation.workflowType}
    </Badge>
  );
};

export const GenerationParams: FC<{ params: Record<string, unknown> }> = ({ params }) => {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-md border bg-muted/30 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        Parameters
      </summary>
      <dl className="grid gap-x-4 gap-y-1.5 border-t px-3 py-2 page-sm:grid-cols-[max-content_1fr]">
        {entries.map(([key, value]) => (
          <div className="contents" key={key}>
            <dt className="font-medium text-muted-foreground">{key}</dt>
            <dd className="min-w-0 font-mono text-xs/5 break-words whitespace-pre-wrap">{formatParamValue(value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
};

export interface AudioOutputsProps {
  /**
   * Shows a download link next to each player, left out where the generation has its own download button.
   */
  hasDownloadLinks: boolean;
  urls: string[];
  variant: NonNullable<AudioPlayerProps['variant']>;
}

export const AudioOutputs: FC<AudioOutputsProps> = ({ hasDownloadLinks, urls, variant }) => (
  <ul className="flex flex-col gap-2">
    {urls.map((url, index) => (
      <li className="flex items-center gap-2 rounded-md border bg-muted/40 p-2" key={url}>
        <AudioPlayer className="min-w-0 flex-1" label={`Output ${(index + 1).toString()}`} preload="none" src={url} variant={variant} />
        {hasDownloadLinks && (
          <a download className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" href={url}>
            <Download aria-hidden="true" className="size-4" />
            <span className="sr-only">Download</span>
          </a>
        )}
      </li>
    ))}
  </ul>
);

export interface DeleteGenerationButtonProps {
  id: string;
  onDeleted?: () => void;
}

export const DeleteGenerationButton: FC<DeleteGenerationButtonProps> = ({ id, onDeleted }) => {
  const { error, isPending, mutate } = useDeleteGeneration();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button aria-label="Delete generation" size="icon-sm" type="button" variant="ghost" onClick={() => { setIsConfirming(true); }}>
        <Trash2 aria-hidden="true" />
      </Button>
    );
  }

  const handleConfirm = (): void => {
    mutate(id, {
      onSuccess: () => {
        onDeleted?.();
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      {error !== null && <span className="text-xs text-destructive" role="alert">{error.message}</span>}
      <Button disabled={isPending} size="sm" type="button" variant="ghost" onClick={() => { setIsConfirming(false); }}>
        Cancel
      </Button>
      <Button disabled={isPending} size="sm" type="button" variant="destructive" onClick={handleConfirm}>
        <Trash2 aria-hidden="true" />
        {isPending ? 'Deleting…' : 'Delete'}
      </Button>
    </div>
  );
};
