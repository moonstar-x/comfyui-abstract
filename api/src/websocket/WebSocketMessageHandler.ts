import { EventEmitter } from 'node:events';
import path from 'node:path';
import { logger } from '@moonstar-x/logger';
import type { ComfyUiClientSession, QueueJob } from '../services/comfyui/ComfyUiClientSession.js';
import { EMPTY_SYSTEM_USAGE } from '../services/comfyui/ComfyUiClientSession.js';
import type { ComfyUiWorkflow } from '../services/comfyui/ComfyUiWorkflow.js';
import { saveFileToPublic } from '../services/outputs/storage.js';
import type { Nullable } from '../utils/types.js';
import { makeWorkflow } from '../workflows/factory.js';
import type { WorkflowType } from '../workflows/types.js';
import type { RunWorkflowPayload, WSClientMessage } from './messages/client.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';

/**
 * Emitted for messages that are not a direct response to a client message, such as a workflow finishing.
 */
export interface WebSocketMessageHandlerEvents {
  message: [WSServerMessage];
}

export class WebSocketMessageHandler extends EventEmitter<WebSocketMessageHandlerEvents> {
  private _comfyUiSession: Nullable<ComfyUiClientSession> = null;

  public async handle(message: WSClientMessage): Promise<Nullable<WSServerMessage>> {
    switch (message.type) {
      case 'get_queue':
        return await this.handleGetQueue(message.payload?.promptId);
      case 'get_status':
        return await this.handleGetStatus();
      case 'run_workflow':
        return await this.handleRunWorkflow(message.payload);
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

  private async handleRunWorkflow({ params, ...request }: RunWorkflowPayload): Promise<WSServerMessage> {
    const comfyui = this.safeGetComfyUiSession();
    const { workflow, params: workflowParams } = makeWorkflow(request, params);
    const prompt = workflow.makePrompt(workflowParams);

    let promptId: string;
    try {
      promptId = await comfyui.queuePrompt(prompt);
    } catch (error) {
      throw new WebSocketError('Could not queue the workflow in ComfyUI.', { cause: error });
    }

    void this.trackWorkflowCompletion(comfyui, workflow, request.type, promptId);
    return { type: 'workflow_start', payload: { promptId } };
  }

  private safeGetComfyUiSession(): ComfyUiClientSession {
    if (this._comfyUiSession === null) {
      throw new WebSocketError('Attempted to interact with ComfyUI without a session. You must call setComfyUiSession() first!');
    }

    return this._comfyUiSession;
  }

  private async trackWorkflowCompletion(comfyui: ComfyUiClientSession, workflow: ComfyUiWorkflow, type: WorkflowType, promptId: string): Promise<void> {
    try {
      const images = await comfyui.waitForOutputImages(promptId, workflow.outputNodeId);
      // Stored as <type>/<promptId>-<n>.<ext>, keeping the extension ComfyUI saved the image with.
      const urls = await Promise.all(images.map(async ({ filename, data }, index) => await saveFileToPublic(type, `${promptId}-${(index + 1).toString()}${path.extname(filename)}`, data)));

      this.emit('message', { type: 'workflow_complete', payload: { promptId, images: urls } });
    } catch (error) {
      logger.error(`Could not retrieve the outputs of workflow ${promptId}.`, error);
      const message = error instanceof Error ? error.message : 'Could not retrieve the workflow outputs.';
      this.emit('message', { type: 'workflow_error', payload: { promptId, message } });
    }
  }
}
