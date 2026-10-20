import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import { DOCS_FILE } from '../../config/environment.js';

/**
 * Markdown instructions keyed by the name of the diffusion or LoRA model they describe, as written in the config.
 */
export type AppDocumentation = Record<string, string>;

const AppDocumentationSchema: z.ZodType<AppDocumentation> = z.record(z.string(), z.string());

const state: { documentation: AppDocumentation | null } = { documentation: null };

const isMissingFileError = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'ENOENT';

/**
 * Loads the docs file. Unlike the config, the docs file is optional, so a missing file leaves every model without documentation.
 */
export const loadDocumentation = async (): Promise<AppDocumentation> => {
  let content: string;
  try {
    content = await readFile(DOCS_FILE, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      state.documentation = {};
      return state.documentation;
    }

    throw new Error(`Could not read docs file at ${DOCS_FILE}.`, { cause: error });
  }

  let data: unknown;
  try {
    data = parse(content);
  } catch (error) {
    throw new Error(`Docs file at ${DOCS_FILE} is not valid YAML.`, { cause: error });
  }

  // An empty file parses as null.
  const result = AppDocumentationSchema.safeParse(data ?? {});
  if (!result.success) {
    throw new Error(`Docs file at ${DOCS_FILE} is invalid:\n${z.prettifyError(result.error)}`);
  }

  state.documentation = result.data;
  return state.documentation;
};

export const getDocumentation = (): AppDocumentation => {
  if (!state.documentation) {
    throw new Error('Documentation has not been loaded yet. Call loadDocumentation() first.');
  }

  return state.documentation;
};
