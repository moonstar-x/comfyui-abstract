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

export const PORT: number = getInteger('PORT', 4000);

export const COMFYUI_URL: string = getRequired('COMFYUI_URL');

export const POSTGRES_HOST: string = getRequired('POSTGRES_HOST');
export const POSTGRES_PORT: number = getInteger('POSTGRES_PORT', 5432);
export const POSTGRES_USER: string = getRequired('POSTGRES_USER');
export const POSTGRES_PASSWORD: string = getRequired('POSTGRES_PASSWORD');
export const POSTGRES_DATABASE: string = getRequired('POSTGRES_DATABASE');
export const POSTGRES_MAX_CONNECTIONS: number = getInteger('POSTGRES_MAX_CONNECTIONS', 25);
