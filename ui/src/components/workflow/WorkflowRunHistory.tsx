import { AudioPlayer } from '@components/audio/AudioPlayer';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { Nullable } from '@core/utils/types';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import { Download } from 'lucide-react';
import type { FC } from 'react';

export interface WorkflowRunHistoryProps {
  error: Nullable<Error>;
  files: readonly string[];
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
              {files.map((url) => (
                <li className="flex items-center gap-2 rounded-md border bg-muted/40 p-2" key={url}>
                  <AudioPlayer className="min-w-0 flex-1" label="Previous workflow output" preload="none" src={url} variant="compact" />
                  <a download className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" href={url}>
                    <Download aria-hidden="true" className="size-4" />
                    <span className="sr-only">Download</span>
                  </a>
                </li>
              ))}
            </ul>
          )
        : (
            <div className="grid grid-cols-3 gap-2 page-sm:grid-cols-4">
              {files.map((url) => (
                <button className="aspect-square cursor-zoom-in overflow-hidden rounded-md border bg-muted/40" key={url} type="button" onClick={() => { onOpen(url); }}>
                  <img alt="Previous workflow output" className="size-full object-cover" loading="lazy" src={url} />
                </button>
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
