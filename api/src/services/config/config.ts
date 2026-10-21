import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import { CONFIG_FILE } from '../../config/environment.js';
import type { AppConfig } from './schema.js';
import { AppConfigSchema } from './schema.js';

const state: { config: AppConfig | null } = { config: null };

export const loadConfig = async (): Promise<AppConfig> => {
  let content: string;
  try {
    content = await readFile(CONFIG_FILE, 'utf8');
  } catch (error) {
    throw new Error(`Could not read config file at ${CONFIG_FILE}.`, { cause: error });
  }

  let data: unknown;
  try {
    data = parse(content);
  } catch (error) {
    throw new Error(`Config file at ${CONFIG_FILE} is not valid YAML.`, { cause: error });
  }

  const result = AppConfigSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Config file at ${CONFIG_FILE} is invalid:\n${z.prettifyError(result.error)}`);
  }

  state.config = result.data;
  return state.config;
};

export const getConfig = (): AppConfig => {
  if (!state.config) {
    throw new Error('Config has not been loaded yet. Call loadConfig() first.');
  }

  return state.config;
};
