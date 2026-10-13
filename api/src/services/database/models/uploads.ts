import type { MediaType } from './generations.js';

export interface UploadRow {
  comfy_filename: string;
  created_at: Date;
  id: string;
  media_type: MediaType;
  mime_type: string;
  original_filename: null | string;
  /**
   * BIGINT, which the driver returns as a string to avoid losing precision.
   */
  size_bytes: string;
  username: string;
}
