import type { WorkflowField } from '@core/workflows/definitions';
import type { ParsedWorkflowParams } from '@core/workflows/params';
import { uploadFile } from '@services/api/uploads';

const getErrorMessage = (error: unknown, fallback: string): string => error instanceof Error ? error.message : fallback;

/**
 * Uploads the files held by the audio and image params returned by parseWorkflowParams, and replaces them with their upload references.
 * Every file is uploaded in parallel, and a failed upload is reported as an error of its field.
 */
export const uploadWorkflowFiles = async (fields: readonly WorkflowField[], params: Record<string, unknown>): Promise<ParsedWorkflowParams> => {
  const errors: ParsedWorkflowParams['errors'] = {};
  const uploaded = await Promise.all(fields.map(async (field): Promise<[string, unknown]> => {
    const value = params[field.key];

    try {
      if (field.kind === 'audio' && value instanceof File) {
        return [field.key, await uploadFile('audio', value)];
      }

      // Images picked from earlier uploads are already references, and keep their place in the list.
      if (field.kind === 'image-list' && Array.isArray(value)) {
        const images = value.filter((item) => item instanceof File || typeof item === 'string');
        return [field.key, await Promise.all(images.map(async (image) => typeof image === 'string' ? image : await uploadFile('image', image)))];
      }
    } catch (error) {
      errors[field.key] = getErrorMessage(error, `Could not upload the files of ${field.label}.`);
    }

    return [field.key, value];
  }));

  // Fields left out of the params, so the API applies its defaults, stay left out.
  const entries = uploaded.filter(([key]) => Object.hasOwn(params, key));
  return { params: Object.fromEntries(entries), errors };
};
