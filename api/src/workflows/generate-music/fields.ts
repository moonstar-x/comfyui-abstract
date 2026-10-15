import { TEXT_TO_IMAGE_FIELDS } from '../image-generate/fields.js';
import type { WorkflowField } from '../types.js';

type TextToMusicParam = 'captionPrompt' | 'cfg' | 'clip' | 'lyricsPrompt' | 'maxDuration' | 'model' | 'sampler' | 'scheduler' | 'seed' | 'steps' | 'tiledDecode' | 'vae';

export type SharedMusicParam = 'cfg' | 'lyricsPrompt' | 'maxDuration' | 'sampler' | 'scheduler' | 'seed' | 'steps';

const { cfg, clip, model, sampler, scheduler, seed, steps, vae } = TEXT_TO_IMAGE_FIELDS;

export const STYLE_PROMPT_FIELD: WorkflowField = { kind: 'text', label: 'Style', multiline: true, required: true, placeholder: 'Describe the genre, mood, instruments and vocals…' };

export const makeSharedMusicFields = (maxDuration: number): Readonly<Record<SharedMusicParam, WorkflowField>> => ({
  lyricsPrompt: { kind: 'text', label: 'Lyrics', multiline: true, required: true, placeholder: '[Verse]\nWrite the lyrics, split into sections…' },
  maxDuration: { kind: 'number', label: 'Max Duration', min: 1, max: maxDuration, step: 1, description: `In seconds, up to ${maxDuration.toString()}.` },
  steps,
  cfg,
  sampler,
  scheduler,
  seed
});

export const makeTextToMusicFields = (maxDuration: number): Readonly<Record<TextToMusicParam, WorkflowField>> => {
  const { lyricsPrompt, ...rest } = makeSharedMusicFields(maxDuration);

  return {
    captionPrompt: STYLE_PROMPT_FIELD,
    lyricsPrompt,
    ...rest,
    tiledDecode: { kind: 'boolean', label: 'Tiled Decode', description: 'Decodes the audio in chunks to reduce VRAM usage.' },
    model,
    clip,
    vae
  };
};

type YuE2MusicParam = 'abcPlanning' | 'mode' | 'model' | 'stylePrompt' | SharedMusicParam;

export const YUE2_MODES = ['full', 'melody'] as const;

export const makeYuE2MusicFields = (maxDuration: number): Readonly<Record<YuE2MusicParam, WorkflowField>> => {
  const { lyricsPrompt, ...rest } = makeSharedMusicFields(maxDuration);

  return {
    stylePrompt: STYLE_PROMPT_FIELD,
    lyricsPrompt,
    mode: { kind: 'select', label: 'Mode', options: YUE2_MODES },
    ...rest,
    abcPlanning: { kind: 'boolean', label: 'ABC Planning', description: 'Plans the song in ABC notation before generating the audio.' },
    model: { kind: 'text', label: 'Checkpoint' }
  };
};
