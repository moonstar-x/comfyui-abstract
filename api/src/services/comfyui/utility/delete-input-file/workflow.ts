import type { ComfyApi } from '@saintno/comfyui-sdk';
import { PromptBuilder } from '@saintno/comfyui-sdk';
import { executeWorkflow } from '../../utils.js';
import prompt from './workflow.json' with { type: 'json' };

/**
 * Deletes a file from the ComfyUI input directory, given its path relative to it such as the comfy_filename of an upload.
 * The client must be initialized, since the execution is tracked through its websocket events.
 */
export const deleteInputFile = async (client: ComfyApi, filename: string): Promise<void> => {
  const builder = new PromptBuilder(prompt, ['filename'], [])
    .setInputNode('filename', '3.inputs.filename')
    .input('filename', filename);

  await executeWorkflow(client, builder);
};
