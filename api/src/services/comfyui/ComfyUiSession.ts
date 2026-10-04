import { Buffer } from 'node:buffer';
import type { HistoryEntry, QueuePromptResponse, QueueResponse } from '@saintno/comfyui-sdk';
import { ComfyApi } from '@saintno/comfyui-sdk';
import { COMFYUI_URL } from '../../config/environment.js';

export type ComfyUiConnectionState = 'connected' | 'disconnected' | 'reconnected' | 'reconnecting';

export interface ComfyUiMessage {
  data: unknown;
  type: string;
}

export interface ComfyUiPreview {
  image: Buffer;
  mimeType: string;
}

export interface ComfyUiSessionHandlers {
  onConnectionError: (error: Error) => void;
  onConnectionState: (state: ComfyUiConnectionState) => void;
  onMessage: (message: ComfyUiMessage) => void;
  onPreview: (preview: ComfyUiPreview) => void;
}

const CONNECTION_STATES: ComfyUiConnectionState[] = ['connected', 'disconnected', 'reconnected', 'reconnecting'];

const emitPreview = async (blob: Blob, onPreview: ComfyUiSessionHandlers['onPreview']): Promise<void> => {
  const image = Buffer.from(await blob.arrayBuffer());
  onPreview({ image, mimeType: blob.type });
};

export class ComfyUiSession {
  private readonly _api: ComfyApi;
  private readonly _unsubscribers: Array<() => void>;

  constructor(handlers: ComfyUiSessionHandlers) {
    this._api = new ComfyApi(COMFYUI_URL);

    this._unsubscribers = [
      this._api.on('all', (event) => {
        handlers.onMessage({ type: event.detail.type, data: event.detail.data as unknown });
      }),
      this._api.on('b_preview', (event) => {
        void emitPreview(event.detail, handlers.onPreview);
      }),
      this._api.on('connection_error', (event) => {
        handlers.onConnectionError(event.detail);
      }),
      ...CONNECTION_STATES.map((state) => this._api.on(state, () => {
        handlers.onConnectionState(state);
      }))
    ];
  }

  public get clientId(): string {
    return this._api.id;
  }

  public destroy(): void {
    for (const unsubscribe of this._unsubscribers) {
      unsubscribe();
    }

    this._api.destroy();
  }

  public async getHistory(promptId: string): Promise<HistoryEntry | undefined> {
    return await this._api.getHistory(promptId);
  }

  public async getQueue(): Promise<QueueResponse> {
    return await this._api.getQueue();
  }

  public async interrupt(): Promise<void> {
    await this._api.interrupt();
  }

  public async queuePrompt(workflow: Record<string, unknown>): Promise<QueuePromptResponse> {
    return await this._api.appendPrompt(workflow);
  }

  public start(): this {
    this._api.init();
    return this;
  }
}
