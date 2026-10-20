import { useLayoutEffect, useRef } from 'react';
import type { RefObject, UIEventHandler } from 'react';

// How close to the bottom still counts as being at the bottom, which absorbs rounding of fractional scroll positions.
const BOTTOM_THRESHOLD_PX = 8;

export interface UseStickToBottomReturn {
  onScroll: UIEventHandler<HTMLElement>;
  ref: RefObject<HTMLDivElement | null>;
}

/**
 * Keeps an element scrolled to the bottom as its content grows, until the user scrolls up. Scrolling back to the bottom sticks again.
 */
export const useStickToBottom = (content: unknown): UseStickToBottomReturn => {
  const ref = useRef<HTMLDivElement>(null);
  const isStuckRef = useRef(true);

  // Runs before paint, so the new lines never flash in at the old scroll position.
  useLayoutEffect(() => {
    const element = ref.current;
    if (element !== null && isStuckRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [content]);

  const onScroll: UIEventHandler<HTMLElement> = (event) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    isStuckRef.current = scrollHeight - scrollTop - clientHeight <= BOTTOM_THRESHOLD_PX;
  };

  return { onScroll, ref };
};
