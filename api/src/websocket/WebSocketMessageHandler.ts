import type { ComfyUiClientSession } from '../services/comfyui/ComfyUiClientSession.js';
import type { Nullable } from '../utils/types.js';
import type { WSClientMessage } from './messages/client.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';

export class WebSocketMessageHandler {
  private _comfyUiSession: Nullable<ComfyUiClientSession> = null;

  public async handle(message: WSClientMessage): Promise<Nullable<WSServerMessage>> {
    switch (message.type) {
      case 'get_health':
        return await this.handleGetHealth();
    }
  }

  public setComfyUiSession(comfyUiSession: ComfyUiClientSession): void {
    this._comfyUiSession = comfyUiSession;
  }

  private async handleGetHealth(): Promise<WSServerMessage> {
    const comfyui = this.safeGetComfyUiSession();
    const isOnlineState = await comfyui.getOnlineState();

    return { type: 'health', payload: { online: isOnlineState } };
  }

  private safeGetComfyUiSession(): ComfyUiClientSession {
    if (this._comfyUiSession === null) {
      throw new WebSocketError('Attempted to interact with ComfyUI without a session. You must call setComfyUiSession() first!');
    }

    return this._comfyUiSession;
  }
}
