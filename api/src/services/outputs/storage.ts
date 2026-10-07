import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIRECTORY } from '../../config/environment.js';

export const PUBLIC_ROUTE = '/public';

export const ensurePublicDirectory = async (): Promise<void> => {
  await mkdir(PUBLIC_DIRECTORY, { recursive: true });
};

export const saveFileToPublic = async (filename: string, data: Uint8Array): Promise<string> => {
  const safeFilename = path.basename(filename);
  await writeFile(path.join(PUBLIC_DIRECTORY, safeFilename), data);

  return `${PUBLIC_ROUTE}/${encodeURIComponent(safeFilename)}`;
};
