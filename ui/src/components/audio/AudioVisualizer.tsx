import { cn } from 'cn';
import { useEffect, useRef } from 'react';
import type { FC } from 'react';

// Bar sizes in CSS pixels, scaled by the device pixel ratio when drawn.
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 2;

// How quickly bars follow the audio, rising fast and falling slow so peaks stay readable.
const RISE = 0.6;
const FALL = 0.12;

// The top of the spectrum rarely carries anything in music, so it's left out to spread the rest across the bars.
const USABLE_BINS = 0.7;

/**
 * The loudest bin within the bar's slice of the spectrum, from 0 to 1.
 * Slices grow towards the highs so the bass doesn't get squeezed into a couple of bars.
 */
const sampleBar = (bins: Uint8Array, index: number, count: number): number => {
  const usable = Math.floor(bins.length * USABLE_BINS);
  const start = Math.floor(((index / count) ** 1.5) * usable);
  const end = Math.max(start + 1, Math.floor((((index + 1) / count) ** 1.5) * usable));

  let peak = 0;
  for (let bin = start; bin < end; bin++) {
    peak = Math.max(peak, bins[bin] ?? 0);
  }

  return peak / 255;
};

/**
 * Eases every bar towards the spectrum, or towards silence without one.
 */
const easeLevels = (levels: Float32Array, bins: null | Uint8Array): Float32Array => levels.map((current, index) => {
  const target = bins ? sampleBar(bins, index, levels.length) : 0;

  return current + ((target - current) * (target > current ? RISE : FALL));
});

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
  isPlaying: boolean;
}

/**
 * Frequency bars for whatever the analyser is listening to. Bars settle back down when playback stops.
 * Takes its color from the CSS `color` of the canvas.
 */
export const AudioVisualizer: FC<AudioVisualizerProps> = ({ analyser, className, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Kept across play and pause so bars ease down from where they were instead of jumping.
  const levelsRef = useRef<Float32Array>(new Float32Array(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let frame: null | number = null;

    const paint = (levels: Float32Array): void => {
      const { width, height } = canvas;
      const ratio = window.devicePixelRatio;
      const barWidth = BAR_WIDTH * ratio;
      const gap = BAR_GAP * ratio;
      const minHeight = MIN_BAR_HEIGHT * ratio;
      const offset = (width - ((levels.length * barWidth) + ((levels.length - 1) * gap))) / 2;

      context.clearRect(0, 0, width, height);
      context.fillStyle = getComputedStyle(canvas).color;

      for (const [index, level] of levels.entries()) {
        const barHeight = Math.max(minHeight, level * height);

        // Quiet bars fade back so silence reads as a dotted line rather than a solid one.
        context.globalAlpha = 0.35 + (0.65 * Math.min(1, level * 3));
        context.beginPath();
        context.roundRect(offset + (index * (barWidth + gap)), (height - barHeight) / 2, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const draw = (): void => {
      frame = null;

      const ratio = window.devicePixelRatio;
      const count = Math.max(1, Math.floor((canvas.width + (BAR_GAP * ratio)) / ((BAR_WIDTH + BAR_GAP) * ratio)));
      const previous = levelsRef.current.length === count ? levelsRef.current : new Float32Array(count);

      const isListening = isPlaying && analyser !== null && bins !== null;
      if (isListening) {
        analyser.getByteFrequencyData(bins);
      }

      const levels = easeLevels(previous, isListening ? bins : null);
      levelsRef.current = levels;
      paint(levels);

      const isSettled = levels.every((level) => level < 0.002);
      if (isPlaying || !isSettled) {
        frame = requestAnimationFrame(draw);
      }
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const ratio = window.devicePixelRatio;
      canvas.width = Math.round(entry.contentRect.width * ratio);
      canvas.height = Math.round(entry.contentRect.height * ratio);

      // Resizing clears the canvas, so it needs redrawing even if nothing is animating.
      if (frame === null) {
        draw();
      }
    });
    resizeObserver.observe(canvas);

    draw();

    return (): void => {
      resizeObserver.disconnect();
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [analyser, isPlaying]);

  return <canvas className={cn('block w-full text-primary', className)} ref={canvasRef} />;
};
