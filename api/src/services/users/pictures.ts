import { randomUUID } from 'node:crypto';
import { logger } from '@moonstar-x/logger';
import type { Nullable } from '../../utils/types.js';
import { deleteFileFromPublic, isPublicFileInFolder, saveFileToPublic } from '../outputs/storage.js';

/**
 * Folder of the public directory that uploaded profile pictures are stored in.
 */
const PROFILE_PICTURES_FOLDER = 'assets/profiles';

/**
 * Stores the picture under a new random name on every upload, so browsers never show a cached previous picture.
 * Returns the URL path it is served at.
 */
export const saveProfilePicture = async (username: string, data: Uint8Array, extension: string): Promise<string> => await saveFileToPublic(PROFILE_PICTURES_FOLDER, `${username}-${randomUUID()}.${extension}`, data);

/**
 * Deletes a picture previously saved with saveProfilePicture. External URLs are left alone, and failures are only logged
 * since the user no longer points at the picture by the time it is deleted.
 */
export const deleteProfilePicture = async (pictureUrl: Nullable<string>): Promise<void> => {
  if (pictureUrl === null || !isPublicFileInFolder(pictureUrl, PROFILE_PICTURES_FOLDER)) {
    return;
  }

  try {
    await deleteFileFromPublic(pictureUrl);
  } catch (error) {
    logger.error(`Could not delete the profile picture ${pictureUrl}.`, error);
  }
};
