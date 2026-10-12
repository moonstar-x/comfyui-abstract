import { AudioPlayer } from '@components/audio/AudioPlayer';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import { cn } from 'cn';
import { Download } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

// Delay between each file's entrance when a run produces several.
const STAGGER_MS = 120;

interface RunResultImageProps {
  animate: boolean;
  index: number;
  onOpen: (url: string) => void;
  url: string;
}

const DownloadLink: FC<{ url: string }> = ({ url }) => (
  <a download className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" href={url}>
    <Download aria-hidden="true" className="size-4" />
    Download
  </a>
);

const RunResultImage: FC<RunResultImageProps> = ({ animate, index, url, onOpen }) => {
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
      <figcaption>
        <DownloadLink url={url} />
      </figcaption>
    </figure>
  );
};

interface RunResultAudioProps {
  animate: boolean;
  index: number;
  url: string;
}

// Audio has nothing to wait for before it can be shown, unlike images, so it animates in right away.
const RunResultAudio: FC<RunResultAudioProps> = ({ animate, index, url }) => (
  <figure
    style={animate ? { animationDelay: `${(index * STAGGER_MS).toString()}ms` } : undefined}
    className={cn(
      'flex flex-col gap-3 rounded-lg border bg-muted/40 p-3',
      animate && 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:ease-out'
    )}
  >
    <AudioPlayer label={`Workflow output ${(index + 1).toString()}`} src={url} />
    <figcaption>
      <DownloadLink url={url} />
    </figcaption>
  </figure>
);

export interface WorkflowRunResultProps {
  /**
   * Plays an entrance animation, meant for results that just finished rather than ones shown when opening the page.
   */
  animate?: boolean;
  files: string[];
  kind: WorkflowOutputKind;
  onOpen: (url: string) => void;
}

export const WorkflowRunResult: FC<WorkflowRunResultProps> = ({ animate = false, files, kind, onOpen }) => {
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
          <RunResultAudio animate={animate} index={index} key={url} url={url} />
        ))}
      </div>
    );
  }

  return (
    <div className={files.length > 1 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
      {files.map((url, index) => (
        <RunResultImage animate={animate} index={index} key={url} url={url} onOpen={onOpen} />
      ))}
    </div>
  );
};
