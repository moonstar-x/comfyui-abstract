import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { parse } from 'yaml';
import { z } from 'zod';
import { MODEL_INSTRUCTIONS_DIRECTORY } from '../../config/environment.js';

/**
 * Markdown instructions keyed by the name of the diffusion or LoRA model they describe, as written in the config.
 */
export type AppDocumentation = Record<string, string>;

const AppDocumentationSchema: z.ZodType<AppDocumentation> = z.record(z.string(), z.string());

const state: { documentation: AppDocumentation | null } = { documentation: null };

const loadFile = async (file: string): Promise<AppDocumentation> => {
  let content: string;
  try {
    content = await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`Could not read model instructions file at ${file}.`, { cause: error });
  }

  let data: unknown;
  try {
    data = parse(content);
  } catch (error) {
    throw new Error(`Model instructions file at ${file} is not valid YAML.`, { cause: error });
  }

  // An empty file parses as null.
  const result = AppDocumentationSchema.safeParse(data ?? {});
  if (!result.success) {
    throw new Error(`Model instructions file at ${file} is invalid:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
};

/**
 * Loads and merges every YAML file in the model instructions directory, including nested ones. Unlike the config, the directory is optional,
 * so a missing directory leaves every model without documentation. A model described by more than one file is an error, since it's unclear
 * which instructions should win.
 */
export const loadDocumentation = async (): Promise<AppDocumentation> => {
  // Missing directories match no files.
  const files = await glob('**/*.yml', { cwd: MODEL_INSTRUCTIONS_DIRECTORY, absolute: true, nodir: true });
  const sortedFiles = files.toSorted((a, b) => a.localeCompare(b));
  const entries = await Promise.all(sortedFiles.map(async (file) => ({ file, documentation: await loadFile(file) })));

  const instructionsWithSources = entries.flatMap(({ file, documentation: fileDocumentation }) => Object.entries(fileDocumentation)
    .map(([name, instructions]) => ({ name, instructions, source: path.relative(MODEL_INSTRUCTIONS_DIRECTORY, file) })));

  const documentation: AppDocumentation = {};
  const sources = new Map<string, string>();
  const errors: string[] = [];
  for (const { name, instructions, source } of instructionsWithSources) {
    const previousSource = sources.get(name);
    if (previousSource === undefined) {
      sources.set(name, source);
      documentation[name] = instructions;
    } else {
      errors.push(`- ${name}: described in both ${previousSource} and ${source}.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Model instructions in ${MODEL_INSTRUCTIONS_DIRECTORY} describe models more than once:\n${errors.join('\n')}`);
  }

  state.documentation = documentation;
  return state.documentation;
};

export const getDocumentation = (): AppDocumentation => {
  if (!state.documentation) {
    throw new Error('Documentation has not been loaded yet. Call loadDocumentation() first.');
  }

  return state.documentation;
};
