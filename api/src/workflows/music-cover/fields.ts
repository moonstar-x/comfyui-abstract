import { UPLOAD_KIND_CONFIGS } from '../../services/uploads/uploads.js';
import { makeSharedMusicFields, STYLE_PROMPT_FIELD } from '../generate-music/fields.js';
import type { SharedMusicParam } from '../generate-music/fields.js';
import { IMAGE_GENERATE_FIELDS } from '../image-generate/fields.js';
import type { WorkflowField } from '../types.js';

type YuE2CoverParam = 'audioEncoder' | 'denoise' | 'model' | 'song' | 'stylePrompt' | SharedMusicParam;

export const makeYuE2CoverFields = (maxDuration: number): Readonly<Record<YuE2CoverParam, WorkflowField>> => {
  const { lyricsPrompt, ...rest } = makeSharedMusicFields(maxDuration);

  return {
    song: { kind: 'audio', label: 'Song', required: true, maxBytes: UPLOAD_KIND_CONFIGS.audio.maxBytes, description: 'The song whose melody is covered.' },
    stylePrompt: STYLE_PROMPT_FIELD,
    lyricsPrompt,
    ...rest,
    denoise: IMAGE_GENERATE_FIELDS.denoise,
    model: { kind: 'text', label: 'Checkpoint' },
    audioEncoder: { kind: 'text', label: 'Audio Encoder' }
  };
};
