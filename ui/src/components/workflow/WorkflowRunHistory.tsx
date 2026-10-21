import { AudioPlayer } from '@components/audio/AudioPlayer';
import { Button } from '@components/ui/third-party/shadcn/button';
import { WorkflowRunHistoryMenu } from '@components/workflow/WorkflowRunHistoryMenu';
import type { GenerationRecord } from '@core/generations/generations';
import type { Nullable } from '@core/utils/types';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import type { FC } from 'react';

/**
 * A file of a previous generation, along with the generation it belongs to so it can be deleted.
 */
export interface WorkflowRunHistoryFile {
  generation: GenerationRecord;
  url: string;
}

export interface WorkflowRunHistoryProps {
  error: Nullable<Error>;
  files: readonly WorkflowRunHistoryFile[];
  hasMore: boolean;
  isLoadingMore: boolean;
  kind: WorkflowOutputKind;
  onLoadMore: () => void;
  onOpen: (url: string) => void;
}

export const WorkflowRunHistory: FC<WorkflowRunHistoryProps> = ({ error, files, hasMore, isLoadingMore, kind, onLoadMore, onOpen }) => {
  if (error === null && files.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Previous generations</h2>
      {error !== null && <p className="text-sm text-destructive" role="alert">{error.message}</p>}
      {kind === 'audio'
        ? (
            <ul className="flex flex-col gap-2">
              {files.map(({ generation, url }) => (
                <li className="flex items-center gap-2 rounded-md border bg-muted/40 p-2" key={url}>
                  <AudioPlayer className="min-w-0 flex-1" label="Previous workflow output" preload="none" src={url} variant="compact" />
                  <WorkflowRunHistoryMenu className="shrink-0" generation={generation} kind={kind} url={url} />
                </li>
              ))}
            </ul>
          )
        : (
            <div className="grid grid-cols-3 gap-2 page-sm:grid-cols-4">
              {files.map(({ generation, url }) => (
                <div className="group/history-tile relative aspect-square overflow-hidden rounded-md border bg-muted/40" key={url}>
                  <button className="size-full cursor-zoom-in" type="button" onClick={() => { onOpen(url); }}>
                    <img alt="Previous workflow output" className="size-full object-cover" loading="lazy" src={url} />
                  </button>
                  {/* Placed after the image so it sits above the button opening it. */}
                  <WorkflowRunHistoryMenu
                    className="absolute top-1.5 right-1.5 bg-background/80 opacity-0 shadow-sm backdrop-blur-xs group-hover/history-tile:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 dark:bg-background/80 dark:hover:bg-muted"
                    generation={generation}
                    kind={kind}
                    url={url}
                  />
                </div>
              ))}
            </div>
          )}
      {hasMore && (
        <Button className="self-center" disabled={isLoadingMore} size="sm" type="button" variant="outline" onClick={onLoadMore}>
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </section>
  );
};
