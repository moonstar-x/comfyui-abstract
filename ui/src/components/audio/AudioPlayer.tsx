import { AudioVisualizer } from '@components/audio/AudioVisualizer';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Slider } from '@components/ui/third-party/shadcn/slider';
import { cn } from 'cn';
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

interface AudioGraph {
  analyser: AnalyserNode;
  gain: GainNode;
  source: MediaElementAudioSourceNode;
}

// Shared by every player, browsers cap how many audio contexts a page can have open.
const shared: { context: AudioContext | null } = { context: null };

const getAudioContext = (): AudioContext | null => {
  if (typeof AudioContext !== 'undefined' && !shared.context) {
    shared.context = new AudioContext();
  }

  return shared.context;
};

// The slider reports arrays for ranges, these players only ever have a single thumb.
const toSingleValue = (value: number | readonly number[]): number => typeof value === 'number' ? value : value[0] ?? 0;

const formatTime = (seconds: number): string => {
  const total = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  const minutes = Math.floor(total / 60);

  return `${minutes.toString()}:${(total % 60).toString().padStart(2, '0')}`;
};

type AudioPlayerVariant = 'compact' | 'full' | 'tile';

const VISUALIZER_CLASSES: Record<AudioPlayerVariant, string> = {
  compact: 'h-6',
  full: 'h-24',
  tile: 'min-h-0 flex-1'
};

// Only the controls of a tile take clicks, letting the rest through to whatever the tile sits on.
const PLAYER_CLASSES: Record<AudioPlayerVariant, string> = {
  compact: 'gap-1',
  full: 'gap-3',
  tile: 'pointer-events-none gap-3 [&_[data-slot=slider]]:pointer-events-auto [&_button]:pointer-events-auto'
};

export interface AudioPlayerProps {
  className?: string;
  label: string;
  preload?: 'metadata' | 'none';
  src: string;
  /**
   * The compact variant fits in a list row, the full one gives the visualizer room to breathe.
   * The tile variant stretches the visualizer to fill a fixed-size container and leaves out the volume bar to fit narrow ones.
   */
  variant?: AudioPlayerVariant;
}

export const AudioPlayer: FC<AudioPlayerProps> = ({ className, label, preload = 'metadata', src, variant = 'full' }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Set while the seek bar is dragged, so playback progress doesn't pull the thumb away from the pointer.
  const [seekValue, setSeekValue] = useState<null | number>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const level = isMuted ? 0 : volume;

  // Volume goes through the gain node rather than the element, so the visualizer isn't flattened by turning it down.
  useEffect(() => {
    const graph = graphRef.current;
    if (graph) {
      graph.gain.gain.setTargetAtTime(level, graph.gain.context.currentTime, 0.015);
    } else if (audioRef.current) {
      audioRef.current.volume = level;
    }
  }, [level]);

  // timeupdate only fires a few times a second, too coarse for a smoothly moving seek bar.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frame = 0;
    const tick = (): void => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return (): void => {
      cancelAnimationFrame(frame);
    };
  }, [isPlaying]);

  useEffect(() => (): void => {
    const graph = graphRef.current;
    if (graph) {
      graph.source.disconnect();
      graph.analyser.disconnect();
      graph.gain.disconnect();
    }
  }, []);

  /**
   * An element can only be routed through Web Audio once, so the graph is built on the first play,
   * which is also the user gesture browsers need before an audio context may start.
   */
  const ensureGraph = (): void => {
    const audio = audioRef.current;
    if (!audio || graphRef.current) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const source = context.createMediaElementSource(audio);
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.75;
    const gain = context.createGain();
    gain.gain.value = level;

    source.connect(analyserNode);
    analyserNode.connect(gain);
    gain.connect(context.destination);

    audio.volume = 1;
    graphRef.current = { analyser: analyserNode, gain, source };
    setAnalyser(analyserNode);
  };

  const handleTogglePlay = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    ensureGraph();
    try {
      await shared.context?.resume();
      await audio.play();
    } catch {
      // A failed play leaves the element paused, and the play and pause events keep the button in step with that.
    }
  };

  const handleSeek = (value: number | readonly number[]): void => {
    const time = toSingleValue(value);
    setSeekValue(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (value: number | readonly number[]): void => {
    const next = toSingleValue(value);
    setVolume(next);
    setIsMuted(next === 0);
  };

  const handleToggleMute = (): void => {
    // Unmuting from a volume dragged to zero would stay silent, so it comes back at full volume instead.
    if (isMuted && volume === 0) {
      setVolume(1);
    }
    setIsMuted(!isMuted);
  };

  const handleDurationChange = (): void => {
    const value = audioRef.current?.duration ?? 0;
    setDuration(Number.isFinite(value) ? value : 0);
  };

  const position = seekValue ?? currentTime;
  const VolumeIcon = level === 0 ? VolumeX : (level < 0.5 ? Volume1 : Volume2);
  const isCompact = variant === 'compact';
  const isTile = variant === 'tile';

  const seekBar = (
    <Slider
      disabled={duration === 0}
      getAriaValueText={(_, value) => `${formatTime(value)} of ${formatTime(duration)}`}
      max={duration > 0 ? duration : 1}
      step={0.01}
      thumbLabel="Seek"
      value={Math.min(position, duration)}
      onValueChange={handleSeek}
      onValueCommitted={() => { setSeekValue(null); }}
    />
  );

  const playButton = (
    <Button aria-label={isPlaying ? 'Pause' : 'Play'} className="rounded-full" size={isCompact ? 'icon' : 'icon-lg'} type="button" onClick={() => { void handleTogglePlay(); }}>
      {isPlaying ? <Pause aria-hidden="true" className="fill-current" /> : <Play aria-hidden="true" className="translate-x-px fill-current" />}
    </Button>
  );

  const time = (
    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
      {formatTime(position)}
      {' / '}
      {formatTime(duration)}
    </span>
  );

  const muteButton = (
    <Button aria-label={isMuted ? 'Unmute' : 'Mute'} size="icon-sm" type="button" variant="ghost" onClick={handleToggleMute}>
      <VolumeIcon aria-hidden="true" />
    </Button>
  );

  const volumeBar = (
    <Slider
      getAriaValueText={(_, value) => `${Math.round(value * 100).toString()}%`}
      max={1}
      step={0.01}
      thumbLabel="Volume"
      value={level}
      onValueChange={handleVolumeChange}
    />
  );

  return (
    <fieldset className={cn('flex min-w-0 flex-col', PLAYER_CLASSES[variant], className)}>
      <legend className="sr-only">{label}</legend>
      {/* Generated audio comes without timed captions to provide. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        crossOrigin="anonymous"
        preload={preload}
        ref={audioRef}
        src={src}
        onDurationChange={handleDurationChange}
        onEnded={() => { setIsPlaying(false); }}
        onLoadedMetadata={handleDurationChange}
        onPause={() => { setIsPlaying(false); }}
        onPlay={() => { setIsPlaying(true); }}
        onTimeUpdate={() => { setCurrentTime(audioRef.current?.currentTime ?? 0); }}
      />

      {isCompact
        ? (
            <div className="flex items-center gap-2">
              {playButton}
              <div className="flex min-w-0 flex-1 flex-col">
                <AudioVisualizer analyser={analyser} className={VISUALIZER_CLASSES[variant]} isPlaying={isPlaying} />
                {seekBar}
              </div>
              {time}
              {muteButton}
              {/* Narrow screens keep just the mute button so the seek bar isn't squeezed. */}
              <div className="hidden w-16 page-sm:block">
                {volumeBar}
              </div>
            </div>
          )
        : (
            <>
              <AudioVisualizer analyser={analyser} className={VISUALIZER_CLASSES[variant]} isPlaying={isPlaying} />
              {seekBar}
              <div className="flex items-center gap-3">
                {playButton}
                {time}
                {isTile
                  ? <div className="ml-auto">{muteButton}</div>
                  : (
                      <div className="ml-auto flex w-32 items-center gap-1">
                        {muteButton}
                        {volumeBar}
                      </div>
                    )}
              </div>
            </>
          )}
    </fieldset>
  );
};
