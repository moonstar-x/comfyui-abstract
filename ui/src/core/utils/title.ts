import type { Nullable } from '@core/utils/types';

const FLASH_INTERVAL_MS = 1000;

// The title pages ask for is kept apart from what is shown, so a flash can always go back to it.
const state: { stopFlash: Nullable<() => void>; title: string } = { stopFlash: null, title: document.title };

export const setDocumentTitle = (title: string): void => {
  state.title = title;
  if (!state.stopFlash) {
    document.title = title;
  }
};

/**
 * Whether the user is looking at something else, such as another tab or another window.
 */
export const isPageInBackground = (): boolean => document.hidden || !document.hasFocus();

/**
 * Alternates the title with the message until the user comes back to the page.
 */
export const flashDocumentTitle = (message: string): void => {
  state.stopFlash?.();

  let isShowingMessage = true;
  document.title = message;
  // Background tabs throttle timers to about once a second, so a faster flash would not be seen anyway.
  const intervalId = setInterval(() => {
    isShowingMessage = !isShowingMessage;
    document.title = isShowingMessage ? message : state.title;
  }, FLASH_INTERVAL_MS);

  const stop = (): void => {
    clearInterval(intervalId);
    removeEventListener('focus', stop);
    state.stopFlash = null;
    document.title = state.title;
  };

  state.stopFlash = stop;
  addEventListener('focus', stop);
};
