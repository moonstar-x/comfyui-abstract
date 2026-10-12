import { TEXT_TO_IMAGE_FIELDS } from '../generate-image/fields.js';
import type { WorkflowField } from '../types.js';

type TextToMusicParam = 'captionPrompt' | 'cfg' | 'clip' | 'lyricsPrompt' | 'maxDuration' | 'model' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'tiledDecode' | 'vae';

const { cfg, clip, model, sampler, scheduler, seed, steps, vae } = TEXT_TO_IMAGE_FIELDS;

export const makeTextToMusicFields = (maxDuration: number): Readonly<Record<TextToMusicParam, WorkflowField>> => ({
  captionPrompt: { kind: 'text', label: 'Style', multiline: true, required: true, placeholder: 'Describe the genre, mood, instruments and vocals…' },
  lyricsPrompt: { kind: 'text', label: 'Lyrics', multiline: true, required: true, placeholder: '[Verse]\nWrite the lyrics, split into sections…' },
  maxDuration: { kind: 'number', label: 'Max Duration', min: 1, max: maxDuration, step: 1, description: `In seconds, up to ${maxDuration.toString()}.` },
  steps,
  cfg,
  sampler,
  scheduler,
  seed,
  tiledDecode: { kind: 'boolean', label: 'Tiled Decode', description: 'Decodes the audio in chunks to reduce VRAM usage.' },
  model,
  clip,
  vae
});
