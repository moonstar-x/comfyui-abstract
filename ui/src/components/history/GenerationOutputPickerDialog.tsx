import { Dialog } from '@base-ui/react/dialog';
import { AudioPlayer } from '@components/audio/AudioPlayer';
import { useGenerations } from '@components/history/hooks/useGenerations';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { formatDateTime } from '@core/generations/generations';
import type { GenerationRecord, MediaType } from '@core/generations/generations';
import { toOutputUrl } from '@core/workflows/outputs';
import { CURRENT_USER } from '@services/api/generations';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import type { FC, ReactNode } from 'react';

/**
 * A single output file of a generation.
 */
export interface GenerationOutput {
  generation: GenerationRecord;
  index: number;
  // Only used as a stable React key and to tell picked outputs apart.
  key: string;
  url: string;
}

const toGenerationOutputs = (generation: GenerationRecord): GenerationOutput[] => generation.outputs.map((output, index) => ({
  generation,
  index,
  key: `${generation.id}/${index.toString()}`,
  url: toOutputUrl(output)
}));

const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-60 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 p-4 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const GRID_CLASSES = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

const SELECTED_CLASSES = 'border-primary bg-accent ring-2 ring-primary';

const OutputDate: FC<{ className: string; output: GenerationOutput }> = ({ className, output }) => (
  <time className={cn('pointer-events-none text-left text-xs whitespace-nowrap tabular-nums', className)} dateTime={output.generation.createdAt}>
    {formatDateTime(output.generation.createdAt)}
  </time>
);

interface OutputTileProps {
  isSelected: boolean;
  onToggle: (output: GenerationOutput) => void;
  output: GenerationOutput;
}

// The player stays usable inside the tile, so the button picking the output sits behind it instead of wrapping it.
const AudioOutputTile: FC<OutputTileProps> = ({ isSelected, onToggle, output }) => (
  <div className={cn('relative flex aspect-square flex-col gap-3 rounded-xl border bg-card p-3 transition-colors', isSelected && SELECTED_CLASSES)}>
    <button
      aria-label="Select this audio"
      aria-pressed={isSelected}
      className={cn('absolute inset-0 cursor-pointer rounded-xl transition-colors', !isSelected && 'hover:bg-muted/50')}
      type="button"
      onClick={() => { onToggle(output); }}
    />
    <AudioPlayer className="relative min-h-0 flex-1" label="Generated audio" preload="none" src={output.url} variant="tile" />
    <OutputDate className="relative text-muted-foreground" output={output} />
  </div>
);

const ImageOutputTile: FC<OutputTileProps> = ({ isSelected, onToggle, output }) => (
  <button
    aria-label="Select this image"
    aria-pressed={isSelected}
    className={cn('relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-muted/40 transition-colors', isSelected && SELECTED_CLASSES)}
    type="button"
    onClick={() => { onToggle(output); }}
  >
    <img alt="" className="size-full object-cover" loading="lazy" src={output.url} />
    <OutputDate className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2.5 pt-6 pb-2 text-white" output={output} />
  </button>
);

interface GenerationOutputListProps {
  emptyMessage: string;
  mediaType: MediaType;
  onToggle: (output: GenerationOutput) => void;
  selectedKeys: ReadonlySet<string>;
}

/**
 * Every output file of the current user's generations of the given media type as a grid, newest first.
 */
const GenerationOutputList: FC<GenerationOutputListProps> = ({ emptyMessage, mediaType, onToggle, selectedKeys }) => {
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useGenerations({ username: CURRENT_USER, mediaType });

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading generations" className={GRID_CLASSES}>
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton className="aspect-square rounded-xl" key={index} />
        ))}
      </div>
    );
  }

  if (error !== null) {
    return <Placeholder>{error.message}</Placeholder>;
  }

  const outputs = data.pages.flatMap((page) => page.generations.flatMap((generation) => toGenerationOutputs(generation)));
  if (outputs.length === 0) {
    return <Placeholder>{emptyMessage}</Placeholder>;
  }

  const OutputTile = mediaType === 'audio' ? AudioOutputTile : ImageOutputTile;
  return (
    <div className="flex flex-col gap-6">
      <div className={GRID_CLASSES}>
        {outputs.map((output) => (
          <OutputTile isSelected={selectedKeys.has(output.key)} key={output.key} output={output} onToggle={onToggle} />
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

export interface GenerationOutputPickerDialogProps {
  emptyMessage: string;
  /**
   * How many files can be picked at once. Defaults to 1, where picking another file replaces the picked one.
   */
  maxSelected?: number;
  mediaType: MediaType;
  onClose: () => void;
  onSelect: (outputs: GenerationOutput[]) => void;
  open: boolean;
  title: string;
}

/**
 * Lets the user pick some of the files they generated of the given media type from a grid, in a modal.
 * Clicking a tile only highlights it, the picked files are confirmed with the Select button.
 */
export const GenerationOutputPickerDialog: FC<GenerationOutputPickerDialogProps> = ({ emptyMessage, maxSelected = 1, mediaType, onClose, onSelect, open, title }) => {
  const [selected, setSelected] = useState<GenerationOutput[]>([]);
  const [wasOpen, setWasOpen] = useState(open);

  // Starts every opening with nothing picked, while keeping the picks highlighted as the modal fades out.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected([]);
    }
  }

  const selectedKeys = new Set(selected.map((output) => output.key));

  const handleToggle = (output: GenerationOutput): void => {
    if (selectedKeys.has(output.key)) {
      setSelected(selected.filter((item) => item.key !== output.key));
    } else if (maxSelected === 1) {
      setSelected([output]);
    } else if (selected.length < maxSelected) {
      setSelected([...selected, output]);
    }
  };

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };

  const handleConfirm = (): void => {
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl -translate-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <Dialog.Title className="text-base font-medium">{title}</Dialog.Title>
            <Dialog.Close render={<Button size="icon-sm" variant="ghost" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <GenerationOutputList emptyMessage={emptyMessage} mediaType={mediaType} selectedKeys={selectedKeys} onToggle={handleToggle} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
              {`Selected ${selected.length.toString()}/${maxSelected.toString()} files`}
            </p>
            <div className="flex gap-2">
              <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
              <Button disabled={selected.length === 0} type="button" onClick={handleConfirm}>Select</Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
