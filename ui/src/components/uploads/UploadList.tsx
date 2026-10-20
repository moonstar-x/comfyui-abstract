import { Button } from '@components/ui/third-party/shadcn/button';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { useUploads } from '@components/uploads/hooks/useUploads';
import { UploadTile } from '@components/uploads/UploadTile';
import { WorkflowImageViewer } from '@components/workflow/WorkflowImageViewer';
import type { ImageGallery } from '@components/workflow/WorkflowImageViewer';
import type { Nullable } from '@core/utils/types';
import type { UploadRecord, UploadsFilter } from '@services/api/uploads';
import { useCallback, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';

const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-60 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 p-4 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const GRID_CLASSES = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export interface UploadListProps {
  /**
   * Shows a delete button on every tile, see UploadTile.
   */
  canDelete?: boolean | undefined;
  emptyMessage: string;
  filter: UploadsFilter;
  /**
   * Makes the tiles toggle whether their upload is picked when clicked, see UploadTile.
   */
  onSelect?: ((upload: UploadRecord) => void) | undefined;
  selectedIds?: ReadonlySet<string> | undefined;
}

/**
 * The current user's uploads as a grid, newest first.
 */
export const UploadList: FC<UploadListProps> = ({ canDelete, emptyMessage, filter, onSelect, selectedIds }) => {
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useUploads(filter);
  const [gallery, setGallery] = useState<Nullable<ImageGallery>>(null);
  // Object URLs of the image uploads whose files have loaded, keyed by upload ID.
  const imageUrlsRef = useRef(new Map<string, string>());

  const handleImageUrlChange = useCallback((id: string, url: string | undefined): void => {
    if (url === undefined) {
      imageUrlsRef.current.delete(id);
    } else {
      imageUrlsRef.current.set(id, url);
    }
  }, []);

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

  // Pages through the loaded images in grid order, skipping audio and files that haven't loaded or failed to.
  const handleOpenImage = (id: string): void => {
    const loaded = uploads.flatMap((upload) => {
      const url = imageUrlsRef.current.get(upload.id);
      return url === undefined ? [] : [{ id: upload.id, url }];
    });
    const index = loaded.findIndex((image) => image.id === id);
    if (index !== -1) {
      setGallery({ images: loaded.map((image) => image.url), index });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className={GRID_CLASSES}>
        {uploads.map((upload) => (
          <UploadTile
            canDelete={canDelete}
            isSelected={selectedIds?.has(upload.id)}
            key={upload.id}
            upload={upload}
            onImageUrlChange={handleImageUrlChange}
            onOpenImage={handleOpenImage}
            onSelect={onSelect}
          />
        ))}
      </div>

      {hasNextPage && (
        <Button className="mt-4 cursor-pointer self-center" disabled={isFetchingNextPage} type="button" variant="outline" onClick={() => { void fetchNextPage(); }}>
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}

      <WorkflowImageViewer gallery={gallery} onClose={() => { setGallery(null); }} />
    </div>
  );
};
