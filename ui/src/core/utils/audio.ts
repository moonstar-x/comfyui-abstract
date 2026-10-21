import type { Nullable } from '@core/utils/types';

// Shared by the whole page, browsers cap how many audio contexts a page can have open.
const shared: { context: Nullable<AudioContext> } = { context: null };

export const getAudioContext = (): Nullable<AudioContext> => {
  if (typeof AudioContext !== 'undefined' && !shared.context) {
    shared.context = new AudioContext();
  }

  return shared.context;
};

/**
 * Starts the audio context, which browsers only allow during a user gesture.
 * Calling this from one lets sounds play later, such as once the tab is in the background.
 */
export const unlockAudio = async (): Promise<void> => {
  try {
    await getAudioContext()?.resume();
  } catch {
    // A context that cannot start yet leaves later sounds silent, which is all that can be done about it.
  }
};

const BEEP_DURATION_S = 0.15;
const BEEP_VOLUME = 0.15;

/**
 * A short, quiet tone, built from an oscillator so no sound file has to be shipped.
 */
export const playBeep = async (frequencyHz: number): Promise<void> => {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  try {
    await context.resume();
  } catch {
    return;
  }

  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequencyHz;

  // Ramping the volume in and out avoids the click of a tone that starts and stops abruptly.
  const gain = context.createGain();
  const start = context.currentTime;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(BEEP_VOLUME, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + BEEP_DURATION_S);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect();
    gain.disconnect();
  });
  oscillator.start(start);
  oscillator.stop(start + BEEP_DURATION_S);
};
