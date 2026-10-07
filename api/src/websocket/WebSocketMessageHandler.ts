import type { ComfyUiClientSession, QueueJob } from '../services/comfyui/ComfyUiClientSession.js';
import { EMPTY_SYSTEM_USAGE } from '../services/comfyui/ComfyUiClientSession.js';
import type { Nullable } from '../utils/types.js';
import type { WSClientMessage } from './messages/client.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';

export class WebSocketMessageHandler {
  private _comfyUiSession: Nullable<ComfyUiClientSession> = null;

  public async handle(message: WSClientMessage): Promise<Nullable<WSServerMessage>> {
    switch (message.type) {
      case 'get_queue':
        return await this.handleGetQueue(message.payload?.promptId);
      case 'get_status':
        return await this.handleGetStatus();
    }
  }

  public setComfyUiSession(comfyUiSession: ComfyUiClientSession): void {
    this._comfyUiSession = comfyUiSession;
  }

  private async handleGetQueue(promptId?: string): Promise<WSServerMessage> {
    const comfyui = this.safeGetComfyUiSession();

    let queue: QueueJob[];
    try {
      queue = await comfyui.getQueue();
    } catch (error) {
      throw new WebSocketError('Could not retrieve the queue from ComfyUI.', { cause: error });
    }

    const running = queue.filter((job) => job.processing).length;
    const index = promptId === undefined ? -1 : queue.findIndex((job) => job.promptId === promptId);
    const job = queue.at(index);
    const jobStatus = index !== -1 && job !== undefined ? { ...job, position: index + 1 } : null;

    return { type: 'queue', payload: { size: queue.length, running, pending: queue.length - running, job: jobStatus } };
  }

  private async handleGetStatus(): Promise<WSServerMessage> {
    const comfyui = this.safeGetComfyUiSession();
    const isOnlineState = await comfyui.getOnlineState();
    const usage = isOnlineState ? await comfyui.getSystemUsage() : EMPTY_SYSTEM_USAGE;

    return { type: 'status', payload: { online: isOnlineState, usage } };
  }

  private safeGetComfyUiSession(): ComfyUiClientSession {
    if (this._comfyUiSession === null) {
      throw new WebSocketError('Attempted to interact with ComfyUI without a session. You must call setComfyUiSession() first!');
    }

    return this._comfyUiSession;
  }
}
