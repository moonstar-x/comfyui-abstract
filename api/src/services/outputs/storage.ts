import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIRECTORY } from '../../config/environment.js';

export const PUBLIC_ROUTE = '/public';

export const ensurePublicDirectory = async (): Promise<void> => {
  await mkdir(PUBLIC_DIRECTORY, { recursive: true });
};

/**
 * Saves a file inside a folder of the public directory and returns the URL path it is served at.
 * Both names are reduced to their basename so the file can never escape the public directory.
 */
export const saveFileToPublic = async (folder: string, filename: string, data: Uint8Array): Promise<string> => {
  const safeFolder = path.basename(folder);
  const safeFilename = path.basename(filename);
  const directory = path.join(PUBLIC_DIRECTORY, safeFolder);

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, safeFilename), data);

  return `${PUBLIC_ROUTE}/${encodeURIComponent(safeFolder)}/${encodeURIComponent(safeFilename)}`;
};
