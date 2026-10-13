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

const SELECTED_CLASSES = 'border-primary bg-accent ring-2 ring-primary';

const FileError: FC = () => (
  <div className="flex min-h-0 flex-1 items-center justify-center p-3 text-center text-sm text-muted-foreground">
    Could not load the file
  </div>
);

export interface UploadTileProps {
  /**
   * Highlights the tile as picked, see onSelect.
   */
  isSelected?: boolean | undefined;
  onImageUrlChange: (id: string, url: string | undefined) => void;
  onOpenImage: (id: string) => void;
  /**
   * Makes the tile toggle whether the upload is picked when clicked, instead of previewing an image.
   */
  onSelect?: ((upload: UploadRecord) => void) | undefined;
  upload: UploadRecord;
}

interface FileTileProps extends Pick<UploadTileProps, 'onSelect' | 'upload'> {
  hasError: boolean;
  isSelected: boolean;
  url: string | undefined;
}

// The player stays usable inside the tile, so the button picking the upload sits behind it instead of wrapping it.
const AudioTile: FC<FileTileProps> = ({ hasError, isSelected, onSelect, upload, url }) => (
  <div className={cn('relative flex aspect-square flex-col gap-3 rounded-xl border bg-card p-3 transition-colors', isSelected && SELECTED_CLASSES)}>
    {onSelect !== undefined && (
      <button
        aria-label="Select this audio"
        aria-pressed={isSelected}
        className={cn('absolute inset-0 cursor-pointer rounded-xl transition-colors', !isSelected && 'hover:bg-muted/50')}
        type="button"
        onClick={() => { onSelect(upload); }}
      />
    )}
    {hasError && <FileError />}
    {!hasError && (url === undefined ? <Skeleton className="flex-1 rounded-lg" /> : <AudioPlayer className="relative min-h-0 flex-1" label="Uploaded audio" src={url} variant="tile" />)}
    <UploadDetails className="pointer-events-none relative text-muted-foreground" upload={upload} />
  </div>
);

const ImageTile: FC<FileTileProps & Pick<UploadTileProps, 'onOpenImage'>> = ({ hasError, isSelected, onOpenImage, onSelect, upload, url }) => (
  <div className={cn('relative flex aspect-square flex-col overflow-hidden rounded-xl border bg-muted/40 transition-colors', isSelected && SELECTED_CLASSES)}>
    {hasError && <FileError />}
    {!hasError && url === undefined && <Skeleton className="size-full rounded-none" />}
    {!hasError && url !== undefined && (
      <button
        aria-label={onSelect === undefined ? 'Preview uploaded image' : 'Select this image'}
        aria-pressed={onSelect === undefined ? undefined : isSelected}
        className={onSelect === undefined ? 'size-full cursor-zoom-in' : 'size-full cursor-pointer'}
        type="button"
        onClick={() => {
          if (onSelect === undefined) {
            onOpenImage(upload.id);
          } else {
            onSelect(upload);
          }
        }}
      >
        <img alt="" className="size-full object-cover" src={url} />
      </button>
    )}
    <UploadDetails className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2.5 pt-6 pb-2 text-white" upload={upload} />
  </div>
);

/**
 * An upload in the grid, showing its file along with its size and when it was uploaded.
 */
export const UploadTile: FC<UploadTileProps> = ({ isSelected = false, onImageUrlChange, onOpenImage, onSelect, upload }) => {
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

  return isImage
    ? <ImageTile hasError={hasError} isSelected={isSelected} upload={upload} url={url} onOpenImage={onOpenImage} onSelect={onSelect} />
    : <AudioTile hasError={hasError} isSelected={isSelected} upload={upload} url={url} onSelect={onSelect} />;
};
