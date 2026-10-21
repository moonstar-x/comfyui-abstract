import { ComfyApi } from '@saintno/comfyui-sdk';
import { COMFYUI_URL } from '../../config/environment.js';

export const createComfyUiClient = (): ComfyApi => new ComfyApi(COMFYUI_URL);

/**
 * Creates a client and waits for its websocket to connect, which is required to track the execution of the prompts it queues.
 * The SDK's waitForReady() is not enough, since it can resolve before the websocket opens and never resolves if ComfyUI is unreachable.
 */
export const connectComfyUiClient = async (): Promise<ComfyApi> => {
  const client = createComfyUiClient();
  const connection = Promise.withResolvers<undefined>();
  const unsubscribers = [
    client.on('connected', () => {
      connection.resolve(undefined);
    }),
    client.on('connection_error', ({ detail }) => {
      connection.reject(detail);
    })
  ];

  client.init();

  try {
    await connection.promise;
    return client;
  } catch (error) {
    client.destroy();
    throw error;
  } finally {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  }
};
