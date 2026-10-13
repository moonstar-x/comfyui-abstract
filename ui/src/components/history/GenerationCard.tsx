import { AudioOutputs, DeleteGenerationButton, DurationLabel, GenerationParams, WorkflowBadge } from '@components/history/GenerationParts';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { formatDateTime, formatTime } from '@core/generations/generations';
import type { GenerationRecord } from '@core/generations/generations';
import { toOutputUrl } from '@core/workflows/outputs';
import type { FC } from 'react';

interface GenerationOutputsProps {
  generation: GenerationRecord;
  onOpenImage: (images: string[], index: number) => void;
}

const GenerationOutputs: FC<GenerationOutputsProps> = ({ generation, onOpenImage }) => {
  const urls = generation.outputs.map((output) => toOutputUrl(output));
  if (urls.length === 0) {
    return <p className="text-sm text-muted-foreground">This generation did not produce any files.</p>;
  }

  if (generation.mediaType === 'audio') {
    return <AudioOutputs urls={urls} variant="compact" />;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {urls.map((url, index) => (
        <button className="aspect-square cursor-zoom-in overflow-hidden rounded-md border bg-muted/40" key={url} type="button" onClick={() => { onOpenImage(urls, index); }}>
          <img alt={`Output ${(index + 1).toString()}`} className="size-full object-cover" loading="lazy" src={url} />
        </button>
      ))}
    </div>
  );
};

export interface GenerationCardProps {
  canDelete: boolean;
  generation: GenerationRecord;
  onOpenImage: (images: string[], index: number) => void;
}

/**
 * A generation in the history of a single user, which is shown as a timeline grouped by day.
 */
export const GenerationCard: FC<GenerationCardProps> = ({ canDelete, generation, onOpenImage }) => (
  <article className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4">
    <header className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <WorkflowBadge generation={generation} />
          <Badge variant="outline">{generation.model}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time dateTime={generation.createdAt} title={formatDateTime(generation.createdAt)}>{formatTime(generation.createdAt)}</time>
          <DurationLabel generation={generation} />
        </div>
      </div>
      {canDelete && <DeleteGenerationButton id={generation.id} />}
    </header>

    <GenerationOutputs generation={generation} onOpenImage={onOpenImage} />
    <GenerationParams params={generation.params} />
  </article>
);
