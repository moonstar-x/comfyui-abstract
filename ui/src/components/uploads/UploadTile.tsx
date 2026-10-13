import { AudioPlayer } from '@components/audio/AudioPlayer';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { useUploadFileUrl } from '@components/uploads/hooks/useUploads';
import { formatDateTime } from '@core/generations/generations';
import { formatFileSize } from '@core/utils/files';
import type { UploadRecord } from '@services/api/uploads';
import { cn } from 'cn';
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
  upload: UploadRecord;
}

/**
 * An upload in the grid, showing its file along with its size and when it was uploaded.
 */
export const UploadTile: FC<UploadTileProps> = ({ upload }) => {
  const { hasError, url } = useUploadFileUrl(upload.id);

  if (upload.mediaType === 'audio') {
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
      {!hasError && (url === undefined ? <Skeleton className="size-full rounded-none" /> : <img alt="" className="size-full object-cover" src={url} />)}
      <UploadDetails className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2.5 pt-6 pb-2 text-white" upload={upload} />
    </div>
  );
};
