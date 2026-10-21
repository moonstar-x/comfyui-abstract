import { logger } from '@moonstar-x/logger';
import { LMSTUDIO_URL } from '../../config/environment.js';
import { listLmStudioModels } from './client.js';

const MODEL_CHECK_TIMEOUT_MS = 5000;

/**
 * A one line reason, since a full stack trace is too noisy for the common case of LM Studio not running. Fetch hides the reason,
 * such as ECONNREFUSED, in the cause of its error.
 */
const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const { cause } = error;
  const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : null;
  return code === null ? error.message : `${error.message} (${code})`;
};

/**
 * Warns when the configured model is not listed by LM Studio. LM Studio may answer requests for an unknown model with whichever model is loaded
 * instead of failing, so a typo in the config would otherwise go unnoticed. Never throws, since LM Studio may simply not be running yet.
 */
export const warnIfLmStudioModelIsMissing = async (model: string): Promise<void> => {
  let models: string[];
  try {
    models = await listLmStudioModels(AbortSignal.timeout(MODEL_CHECK_TIMEOUT_MS));
  } catch (error) {
    logger.warn(`Could not check whether LM Studio at ${LMSTUDIO_URL} has the configured model ${model}: ${describeError(error)}.`);
    return;
  }

  if (!models.includes(model)) {
    const available = models.length > 0 ? models.join(', ') : 'none';
    logger.warn(`LM Studio does not list the configured model ${model}. Available models: ${available}.`);
  }
};
