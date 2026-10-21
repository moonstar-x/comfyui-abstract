import type { CallWrapperResult, ComfyApi, NodeData, OutputValuesMap, PromptBuilder } from '@saintno/comfyui-sdk';
import { CallWrapper } from '@saintno/comfyui-sdk';
import { z } from 'zod';

export const makeRandomSeed = (): number => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

/**
 * Seed param that falls back to a random seed when omitted. A transform is used instead of a default so the random value
 * is not reported as the default of the param, which would make the client prefill a fixed seed.
 */
export const SeedSchema: z.ZodType<number, number | undefined> = z.number().int().optional().transform((seed) => seed ?? makeRandomSeed());

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
