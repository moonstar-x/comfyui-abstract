import type { ComfyApi } from '@saintno/comfyui-sdk';
import { createComfyUiClient } from './client.js';

export class ComfyUiClientSession {
  private readonly _client: ComfyApi;

  constructor(client: ComfyApi) {
    this._client = client;
    this.registerEventHandlers();
  }

  public get clientId(): string {
    return this._client.id;
  }

  public destroy(): void {
    this._client.removeAllListeners();
    this._client.destroy();
  }

  public async getOnlineState(): Promise<boolean> {
    try {
      const { status } = await this._client.ping();
      return status;
    } catch {
      return false;
    }
  }

  public start(): this {
    this._client.init();
    return this;
  }

  private registerEventHandlers(): void {
    this._client.on('all', (event) => console.log(event));
  }

  public static create(): ComfyUiClientSession {
    return new ComfyUiClientSession(createComfyUiClient());
  }
}
