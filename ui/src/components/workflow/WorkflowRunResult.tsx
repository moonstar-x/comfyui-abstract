import { AudioPlayer } from '@components/audio/AudioPlayer';
import type { Generation } from '@components/generation/GenerationSessionContext';
import { DurationText } from '@components/history/GenerationParts';
import { DownloadLink } from '@components/ui/app/DownloadLink';
import { buttonVariants } from '@components/ui/third-party/shadcn/button';
import { DeleteRunResultButton } from '@components/workflow/DeleteRunResultButton';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import { cn } from 'cn';
import { Download } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

// Delay between each file's entrance when a run produces several.
const STAGGER_MS = 120;

interface RunResultImageProps {
  animate: boolean;
  generation: Generation;
  index: number;
  onOpen: (url: string) => void;
  url: string;
}

const RunResultCaption: FC<{ generation: Generation; url: string }> = ({ generation, url }) => (
  <figcaption className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <DownloadLink className={buttonVariants({ size: 'sm', variant: 'outline' })} url={url}>
        <Download aria-hidden="true" data-icon="inline-start" />
        Download
      </DownloadLink>
      {/* A run the API could not store has no generation to delete. */}
      {generation.generationId !== null && <DeleteRunResultButton generation={generation} generationId={generation.generationId} />}
    </div>
    <DurationText className="text-sm text-muted-foreground" durationMs={generation.durationMs} queueWaitMs={generation.queueWaitMs} />
  </figcaption>
);

const RunResultImage: FC<RunResultImageProps> = ({ animate, generation, index, url, onOpen }) => {
  // The entrance waits for the image to load, otherwise it would play on an empty frame.
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <figure
      style={animate ? { animationDelay: `${(index * STAGGER_MS).toString()}ms` } : undefined}
      className={cn(
        'flex flex-col gap-2',
        animate && !isLoaded && 'motion-safe:opacity-0',
        animate && isLoaded && 'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:ease-out'
      )}
    >
      <button className="cursor-zoom-in overflow-hidden rounded-lg border bg-muted/40" type="button" onClick={() => { onOpen(url); }}>
        <img alt={`Workflow output ${(index + 1).toString()}`} className="h-auto w-full" src={url} onLoad={() => { setIsLoaded(true); }} />
      </button>
      <RunResultCaption generation={generation} url={url} />
    </figure>
  );
};

interface RunResultAudioProps {
  animate: boolean;
  generation: Generation;
  index: number;
  url: string;
}

// Audio has nothing to wait for before it can be shown, unlike images, so it animates in right away.
const RunResultAudio: FC<RunResultAudioProps> = ({ animate, generation, index, url }) => (
  <figure
    style={animate ? { animationDelay: `${(index * STAGGER_MS).toString()}ms` } : undefined}
    className={cn(
      'flex flex-col gap-3 rounded-lg border bg-muted/40 p-3',
      animate && 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:ease-out'
    )}
  >
    <AudioPlayer label={`Workflow output ${(index + 1).toString()}`} src={url} />
    <RunResultCaption generation={generation} url={url} />
  </figure>
);

export interface WorkflowRunResultProps {
  /**
   * Plays an entrance animation, meant for results that just finished rather than ones shown when opening the page.
   */
  animate?: boolean;
  generation: Generation;
  kind: WorkflowOutputKind;
  onOpen: (url: string) => void;
}

export const WorkflowRunResult: FC<WorkflowRunResultProps> = ({ animate = false, generation, kind, onOpen }) => {
  const { files } = generation;
  if (files.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {kind === 'audio' ? 'The workflow finished without producing any audio.' : 'The workflow finished without producing any images.'}
      </p>
    );
  }

  // Players need the full width for their controls, so audio is always stacked.
  if (kind === 'audio') {
    return (
      <div className="grid gap-4">
        {files.map((url, index) => (
          <RunResultAudio animate={animate} generation={generation} index={index} key={url} url={url} />
        ))}
      </div>
    );
  }

  return (
    <div className={files.length > 1 ? 'grid gap-4 page-sm:grid-cols-2' : 'grid gap-4'}>
      {files.map((url, index) => (
        <RunResultImage animate={animate} generation={generation} index={index} key={url} url={url} onOpen={onOpen} />
      ))}
    </div>
  );
};
