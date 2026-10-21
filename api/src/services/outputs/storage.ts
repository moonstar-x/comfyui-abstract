import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIRECTORY } from '../../config/environment.js';

export const PUBLIC_ROUTE = '/public';

export const ensurePublicDirectory = async (): Promise<void> => {
  await mkdir(PUBLIC_DIRECTORY, { recursive: true });
};

const isSafeSegment = (segment: string | undefined): segment is string => segment !== undefined && segment !== '' && segment !== '.' && segment !== '..' && path.basename(segment) === segment;

/**
 * Splits a folder such as assets/profiles into its segments, rejecting any that could escape the public directory.
 */
const toSafeSegments = (folder: string): string[] => {
  const segments = folder.split('/');
  if (segments.some((segment) => !isSafeSegment(segment))) {
    throw new Error(`Invalid public folder ${folder}.`);
  }

  return segments;
};

/**
 * Saves a file inside a folder of the public directory and returns the URL path it is served at.
 * The folder may be nested (assets/profiles), and the filename is reduced to its basename so the file can never escape the public directory.
 */
export const saveFileToPublic = async (folder: string, filename: string, data: Uint8Array): Promise<string> => {
  const segments = [...toSafeSegments(folder), path.basename(filename)];
  const directory = path.join(PUBLIC_DIRECTORY, ...segments.slice(0, -1));

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(PUBLIC_DIRECTORY, ...segments), data);

  return [PUBLIC_ROUTE, ...segments.map((segment) => encodeURIComponent(segment))].join('/');
};

/**
 * Tells whether the URL path points at a file saved with saveFileToPublic inside the given folder.
 */
export const isPublicFileInFolder = (urlPath: string, folder: string): boolean => urlPath.startsWith(`${PUBLIC_ROUTE}/${folder}/`);

/**
 * Resolves the URL path a file saved with saveFileToPublic is served at to its path on disk, rejecting any that could escape the public directory.
 */
const toPublicFilePath = (urlPath: string): string => {
  const prefix = `${PUBLIC_ROUTE}/`;
  const segments = urlPath.startsWith(prefix) ? urlPath.slice(prefix.length).split('/').map((segment) => decodeURIComponent(segment)) : [];
  if (segments.length < 2 || segments.some((segment) => !isSafeSegment(segment))) {
    throw new Error(`Invalid public file path ${urlPath}.`);
  }

  return path.join(PUBLIC_DIRECTORY, ...segments);
};

/**
 * Reads a file previously saved with saveFileToPublic, given the URL path it is served at.
 */
export const readFileFromPublic = async (urlPath: string): Promise<Uint8Array> => await readFile(toPublicFilePath(urlPath));

/**
 * Deletes a file previously saved with saveFileToPublic, given the URL path it is served at. Missing files are ignored.
 */
export const deleteFileFromPublic = async (urlPath: string): Promise<void> => {
  await rm(toPublicFilePath(urlPath), { force: true });
};
