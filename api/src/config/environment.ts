import path from 'node:path';
import process from 'node:process';
// eslint-disable-next-line import-x/no-unassigned-import
import 'dotenv/config';

const getRequired = (key: string): string => {
  const value = process.env[key];
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing required environment variable ${key}.`);
  }

  return value;
};

const getString = (key: string, defaultValue: string): string => {
  const value = process.env[key];
  return typeof value === 'string' && value !== '' ? value : defaultValue;
};

const getInteger = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (typeof value !== 'string' || value === '') {
    return defaultValue;
  }

  const parsed = Math.trunc(Number(value));
  if (Number.isNaN(parsed)) {
    throw new TypeError(`Environment variable ${key} must be a number, got "${value}".`);
  }

  return parsed;
};

const getPositiveInteger = (key: string, defaultValue: number): number => {
  const value = getInteger(key, defaultValue);
  if (value <= 0) {
    throw new TypeError(`Environment variable ${key} must be greater than 0, got "${value.toString()}".`);
  }

  return value;
};

const isFlagEnabled = (key: string, isEnabledByDefault: boolean): boolean => {
  const value = process.env[key];
  if (typeof value !== 'string' || value === '') {
    return isEnabledByDefault;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new TypeError(`Environment variable ${key} must be true or false, got "${value}".`);
};

/**
 * Accepts a path relative to another directory made of letters, digits, underscores and dashes, such as "uploads/app",
 * so it can't escape that directory and is safe to use in a regex.
 */
const getRelativePath = (key: string, defaultValue: string): string => {
  const value = getString(key, defaultValue);
  if (!/^[\w-]+(?:\/[\w-]+)*$/u.test(value)) {
    throw new TypeError(`Environment variable ${key} must be a relative path of letters, digits, underscores and dashes, got "${value}".`);
  }

  return value;
};

export const PORT: number = getInteger('PORT', 4000);

export const COMFYUI_URL: string = getRequired('COMFYUI_URL');
export const COMFYUI_UPLOAD_SUBFOLDER: string = getRelativePath('COMFYUI_UPLOAD_SUBFOLDER', 'comfyui-abstract');

export const PUBLIC_DIRECTORY: string = path.resolve(getString('PUBLIC_DIRECTORY', 'public'));

export const CONFIG_FILE: string = path.resolve(getString('CONFIG_FILE', 'config.yml'));

export const POSTGRES_HOST: string = getRequired('POSTGRES_HOST');
export const POSTGRES_PORT: number = getInteger('POSTGRES_PORT', 5432);
export const POSTGRES_USER: string = getRequired('POSTGRES_USER');
export const POSTGRES_PASSWORD: string = getRequired('POSTGRES_PASSWORD');
export const POSTGRES_DATABASE: string = getRequired('POSTGRES_DATABASE');
export const POSTGRES_MAX_CONNECTIONS: number = getInteger('POSTGRES_MAX_CONNECTIONS', 25);

export const MAX_AUDIO_UPLOAD_MB: number = getPositiveInteger('MAX_AUDIO_UPLOAD_MB', 50);
export const MAX_IMAGE_UPLOAD_MB: number = getPositiveInteger('MAX_IMAGE_UPLOAD_MB', 20);

export const IS_SIGNUP_ENABLED: boolean = isFlagEnabled('ENABLE_SIGNUP', false);

export const JWT_SECRET: string = getRequired('JWT_SECRET');
export const JWT_EXPIRATION: string = getString('JWT_EXPIRATION', '7d');
