import { Button } from '@components/ui/third-party/shadcn/button';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { useUploads } from '@components/uploads/hooks/useUploads';
import { UploadTile } from '@components/uploads/UploadTile';
import type { UploadsFilter } from '@services/api/uploads';
import type { FC, ReactNode } from 'react';

const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-60 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 p-4 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const GRID_CLASSES = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export interface UploadListProps {
  emptyMessage: string;
  filter: UploadsFilter;
}

/**
 * The current user's uploads as a grid, newest first.
 */
export const UploadList: FC<UploadListProps> = ({ emptyMessage, filter }) => {
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useUploads(filter);

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading uploads" className={GRID_CLASSES}>
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton className="aspect-square rounded-xl" key={index} />
        ))}
      </div>
    );
  }

  if (error !== null) {
    return <Placeholder>{error.message}</Placeholder>;
  }

  const uploads = data.pages.flatMap((page) => page.uploads);
  if (uploads.length === 0) {
    return <Placeholder>{emptyMessage}</Placeholder>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={GRID_CLASSES}>
        {uploads.map((upload) => (
          <UploadTile key={upload.id} upload={upload} />
        ))}
      </div>

      {hasNextPage && (
        <Button className="mt-4 self-center" disabled={isFetchingNextPage} type="button" variant="outline" onClick={() => { void fetchNextPage(); }}>
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  );
};
