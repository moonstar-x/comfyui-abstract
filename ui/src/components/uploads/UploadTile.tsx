import { AudioPlayer } from '@components/audio/AudioPlayer';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { useUploadFileUrl } from '@components/uploads/hooks/useUploads';
import { formatDateTime } from '@core/generations/generations';
import { formatFileSize } from '@core/utils/files';
import type { UploadRecord } from '@services/api/uploads';
import { cn } from 'cn';
import { useEffect } from 'react';
import type { FC } from 'react';

const UploadDetails: FC<{ className?: string; upload: UploadRecord }> = ({ className, upload }) => (
  <div className={cn('flex flex-wrap items-center justify-between gap-x-2 text-xs whitespace-nowrap tabular-nums', className)}>
    <span className="font-medium">{formatFileSize(upload.sizeBytes)}</span>
    <time dateTime={upload.createdAt}>{formatDateTime(upload.createdAt)}</time>
  </div>
);

const FileError: FC = () => (
  <div className="flex min-h-0 flex-1 items-center justify-center p-3 text-center text-sm text-muted-foreground">
    Could not load the file
  </div>
);

export interface UploadTileProps {
  onImageUrlChange: (id: string, url: string | undefined) => void;
  onOpenImage: (id: string) => void;
  upload: UploadRecord;
}

/**
 * An upload in the grid, showing its file along with its size and when it was uploaded.
 */
export const UploadTile: FC<UploadTileProps> = ({ onImageUrlChange, onOpenImage, upload }) => {
  const { hasError, url } = useUploadFileUrl(upload.id);
  const isImage = upload.mediaType !== 'audio';

  // Reported so the preview can page through every image in the grid, not just the one that was clicked.
  useEffect(() => {
    if (!isImage || url === undefined) {
      return;
    }

    onImageUrlChange(upload.id, url);
    return (): void => {
      onImageUrlChange(upload.id, undefined);
    };
  }, [isImage, onImageUrlChange, upload.id, url]);

  if (!isImage) {
    return (
      <div className="flex aspect-square flex-col gap-3 rounded-xl border bg-card p-3">
        {hasError && <FileError />}
        {!hasError && (url === undefined ? <Skeleton className="flex-1 rounded-lg" /> : <AudioPlayer className="min-h-0 flex-1" label="Uploaded audio" src={url} variant="tile" />)}
        <UploadDetails className="text-muted-foreground" upload={upload} />
      </div>
    );
  }

  return (
    <div className="relative flex aspect-square flex-col overflow-hidden rounded-xl border bg-muted/40">
      {hasError && <FileError />}
      {!hasError && url === undefined && <Skeleton className="size-full rounded-none" />}
      {!hasError && url !== undefined && (
        <button aria-label="Preview uploaded image" className="size-full cursor-zoom-in" type="button" onClick={() => { onOpenImage(upload.id); }}>
          <img alt="" className="size-full object-cover" src={url} />
        </button>
      )}
      <UploadDetails className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2.5 pt-6 pb-2 text-white" upload={upload} />
    </div>
  );
};
