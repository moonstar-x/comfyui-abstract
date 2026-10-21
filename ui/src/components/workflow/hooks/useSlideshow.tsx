import { useEffect, useState } from 'react';

export interface UseSlideshowResult {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

// Calls onAdvance once per interval while playing. Passing a new index restarts the timer, so manual navigation gets a full interval too.
export const useSlideshow = (index: number, intervalMs: number, onAdvance: () => void): UseSlideshowResult => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timeout = setTimeout(onAdvance, intervalMs);
    return (): void => {
      clearTimeout(timeout);
    };
  }, [isPlaying, index, intervalMs, onAdvance]);

  return { isPlaying, setIsPlaying };
};
