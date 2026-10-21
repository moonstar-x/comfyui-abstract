import { AudioPlayer } from '@components/audio/AudioPlayer';
import type { GenerationRecord } from '@core/generations/generations';
import { toOutputUrl } from '@core/workflows/outputs';
import { cn } from 'cn';
import { Images } from 'lucide-react';
import type { FC } from 'react';

const OutputCount: FC<{ count: number }> = ({ count }) => (
  <span className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
    <Images aria-hidden="true" className="size-3.5" />
    {count.toString()}
  </span>
);

const SELECTED_CLASSES = 'border-primary bg-accent ring-2 ring-primary';

export interface GenerationTileProps {
  generation: GenerationRecord;
  /**
   * Highlights the tile as selected, see onSelect.
   */
  isSelected?: boolean | undefined;
  onOpen: () => void;
  /**
   * Makes the tile toggle whether the generation is selected when clicked, instead of opening it.
   */
  onSelect?: ((generation: GenerationRecord) => void) | undefined;
}

/**
 * A generation in the grid view of the feed, showing only a preview of its first output.
 */
export const GenerationTile: FC<GenerationTileProps> = ({ generation, isSelected = false, onOpen, onSelect }) => {
  const urls = generation.outputs.map((output) => toOutputUrl(output));
  const [firstUrl] = urls;
  const isSelecting = onSelect !== undefined;
  const label = isSelecting ? `Select ${generation.username}'s generation` : `Open ${generation.username}'s generation`;
  const pressed = isSelecting ? isSelected : undefined;
  const handleClick = (): void => {
    if (onSelect === undefined) {
      onOpen();
    } else {
      onSelect(generation);
    }
  };

  if (firstUrl === undefined) {
    return (
      <button
        aria-label={label}
        aria-pressed={pressed}
        className={cn('flex aspect-square cursor-pointer items-center justify-center rounded-xl border bg-muted/40 p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-muted', isSelected && SELECTED_CLASSES)}
        type="button"
        onClick={handleClick}
      >
        No files
      </button>
    );
  }

  if (generation.mediaType === 'audio') {
    // The player stays usable inside the tile, so the button opening the generation sits behind it instead of wrapping it.
    return (
      <div className={cn('relative flex aspect-square flex-col rounded-xl border bg-card p-3 transition-colors', isSelected && SELECTED_CLASSES)}>
        <button aria-label={label} aria-pressed={pressed} className={cn('absolute inset-0 cursor-pointer rounded-xl transition-colors', !isSelected && 'hover:bg-muted/50')} type="button" onClick={handleClick} />
        <AudioPlayer className="relative min-h-0 flex-1" label={`${generation.username}'s audio`} preload="none" src={firstUrl} variant="tile" />
        {urls.length > 1 && <OutputCount count={urls.length} />}
      </div>
    );
  }

  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={cn('group relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-muted/40 transition-colors', isSelected && SELECTED_CLASSES)}
      type="button"
      onClick={handleClick}
    >
      <img alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" loading="lazy" src={firstUrl} />
      {urls.length > 1 && <OutputCount count={urls.length} />}
    </button>
  );
};
