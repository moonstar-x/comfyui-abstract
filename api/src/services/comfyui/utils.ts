import type { CallWrapperResult, ComfyApi, NodeData, OutputValuesMap, PromptBuilder } from '@saintno/comfyui-sdk';
import { CallWrapper } from '@saintno/comfyui-sdk';

export const makeRandomSeed = (): number => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

/**
 * Queues a workflow and waits for it to finish executing, resolving with the outputs mapped by the builder.
 * The client must be initialized, since the execution is tracked through its websocket events.
 */
export const executeWorkflow = async <I extends string, O extends string, T extends NodeData, R extends OutputValuesMap<O>>(
  client: ComfyApi,
  builder: PromptBuilder<I, O, T, R>
): Promise<CallWrapperResult<O, R>> => {
  // The wrapper resolves run() with false when the workflow fails, reporting the error through onFailed instead.
  // Some failures, such as a disconnection, are only reported through onFailed and never settle run().
  const failure = Promise.withResolvers<never>();
  const wrapper = new CallWrapper(client, builder).onFailed((error) => {
    failure.reject(error);
  });

  const result = await Promise.race([wrapper.run(), failure.promise]);
  if (result === undefined || result === false) {
    throw new Error('The workflow could not be executed.');
  }

  return result;
};
