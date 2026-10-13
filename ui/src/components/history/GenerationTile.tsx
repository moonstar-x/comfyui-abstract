import { AudioPlayer } from '@components/audio/AudioPlayer';
import type { GenerationRecord } from '@core/generations/generations';
import { toOutputUrl } from '@core/workflows/outputs';
import { Images } from 'lucide-react';
import type { FC } from 'react';

const OutputCount: FC<{ count: number }> = ({ count }) => (
  <span className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
    <Images aria-hidden="true" className="size-3.5" />
    {count.toString()}
  </span>
);

export interface GenerationTileProps {
  generation: GenerationRecord;
  onOpen: () => void;
}

/**
 * A generation in the grid view of the feed, showing only a preview of its first output.
 */
export const GenerationTile: FC<GenerationTileProps> = ({ generation, onOpen }) => {
  const urls = generation.outputs.map((output) => toOutputUrl(output));
  const [firstUrl] = urls;
  const label = `Open ${generation.username}'s generation`;

  if (firstUrl === undefined) {
    return (
      <button aria-label={label} className="flex aspect-square items-center justify-center rounded-xl border bg-muted/40 p-3 text-center text-sm text-muted-foreground hover:bg-muted" type="button" onClick={onOpen}>
        No files
      </button>
    );
  }

  if (generation.mediaType === 'audio') {
    // The player stays usable inside the tile, so the button opening the generation sits behind it instead of wrapping it.
    return (
      <div className="relative col-span-2 flex flex-col justify-center rounded-xl border bg-card p-4">
        <button aria-label={label} className="absolute inset-0 cursor-pointer rounded-xl transition-colors hover:bg-muted/50" type="button" onClick={onOpen} />
        <AudioPlayer className="relative" label={`${generation.username}'s audio`} preload="none" src={firstUrl} variant="full" />
        {urls.length > 1 && <OutputCount count={urls.length} />}
      </div>
    );
  }

  return (
    <button aria-label={label} className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-muted/40" type="button" onClick={onOpen}>
      <img alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" loading="lazy" src={firstUrl} />
      {urls.length > 1 && <OutputCount count={urls.length} />}
    </button>
  );
};
