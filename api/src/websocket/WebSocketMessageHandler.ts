import { EventEmitter } from 'node:events';
import path from 'node:path';
import { logger } from '@moonstar-x/logger';
import type { TokenPayload } from '../services/auth/token.js';
import type { ComfyUiClientSession, QueueJob } from '../services/comfyui/ComfyUiClientSession.js';
import { EMPTY_SYSTEM_USAGE } from '../services/comfyui/ComfyUiClientSession.js';
import type { ComfyUiWorkflowInstance, WorkflowOutputKind } from '../services/comfyui/ComfyUiWorkflow.js';
import { MEDIA_TYPES } from '../services/database/models/generations.js';
import type { MediaType } from '../services/database/models/generations.js';
import { createGeneration } from '../services/database/repositories/generations.js';
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

interface TrackedRun {
  createdAt: Date;
  model: string;
  // Number of nodes in the queued prompt, which the progress is counted against.
  nodeCount: number;
  params: Record<string, unknown>;
  promptId: string;
  type: WorkflowType;
  username: string;
  workflowId: string;
}

const OUTPUT_MEDIA_TYPES: Readonly<Record<WorkflowOutputKind, MediaType>> = {
  images: MEDIA_TYPES.IMAGE,
  audio: MEDIA_TYPES.AUDIO
};

/**
 * Failing to save a generation only loses it from the history, so the error is logged instead of failing the run whose files are already saved.
 */
const saveGeneration = async (run: TrackedRun, result: { completedAt: Date; mediaType: MediaType; outputs: string[]; startedAt: Nullable<Date> }): Promise<void> => {
  try {
    await createGeneration({
      username: run.username,
      promptId: run.promptId,
      workflowType: run.type,
      workflowId: run.workflowId,
      model: run.model,
      params: run.params,
      createdAt: run.createdAt,
      ...result
    });
  } catch (error) {
    logger.error(`Could not save the generation of workflow ${run.promptId} for user ${run.username}.`, error);
  }
};

export class WebSocketMessageHandler extends EventEmitter<WebSocketMessageHandlerEvents> {
  private _comfyUiSession: Nullable<ComfyUiClientSession> = null;

  public async handle(message: WSClientMessage, user: TokenPayload): Promise<Nullable<WSServerMessage>> {
    switch (message.type) {
      case 'comfyui_free_up_memory':
        return await this.handleFreeUpMemory();
      case 'get_queue':
        return await this.handleGetQueue(message.payload?.promptId);
      case 'get_status':
        return await this.handleGetStatus();
      case 'run_workflow':
        return await this.handleRunWorkflow(message.payload, user);
    }
  }

  public setComfyUiSession(comfyUiSession: ComfyUiClientSession): void {
    this._comfyUiSession = comfyUiSession;
  }

  private async handleFreeUpMemory(): Promise<WSServerMessage> {
    const comfyui = this.safeGetComfyUiSession();

    if (!await comfyui.freeMemory()) {
      throw new WebSocketError('Could not free up the memory in ComfyUI.');
    }

    return { type: 'comfyui_memory_freed', payload: {} };
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

  private async handleRunWorkflow({ params, ...request }: RunWorkflowPayload, { username }: TokenPayload): Promise<WSServerMessage> {
    const comfyui = this.safeGetComfyUiSession();
    const { workflow, workflowId, params: workflowParams } = makeWorkflow(request, params);
    const { prompt, params: resolvedParams } = workflow.makePrompt(workflowParams);

    const createdAt = new Date();
    let promptId: string;
    try {
      promptId = await comfyui.queuePrompt(prompt);
    } catch (error) {
      throw new WebSocketError('Could not queue the workflow in ComfyUI.', { cause: error });
    }

    void this.trackWorkflowCompletion(comfyui, workflow, {
      promptId,
      type: request.type,
      model: request.model,
      workflowId,
      username,
      params: { ...resolvedParams },
      createdAt,
      nodeCount: Object.keys(prompt).length
    });
    return { type: 'workflow_start', payload: { promptId } };
  }

  private safeGetComfyUiSession(): ComfyUiClientSession {
    if (this._comfyUiSession === null) {
      throw new WebSocketError('Attempted to interact with ComfyUI without a session. You must call setComfyUiSession() first!');
    }

    return this._comfyUiSession;
  }

  private async trackWorkflowCompletion(comfyui: ComfyUiClientSession, workflow: ComfyUiWorkflowInstance, run: TrackedRun): Promise<void> {
    const { promptId, type, nodeCount } = run;
    // The first progress event is sent once ComfyUI picks the prompt from the queue, which marks the end of the wait in the queue.
    let startedAt: Nullable<Date> = null;
    const stopProgress = comfyui.onPromptProgress(promptId, nodeCount, (progress) => {
      startedAt ??= new Date();
      this.emit('message', { type: 'workflow_progress', payload: { promptId, ...progress } });
    });

    try {
      const files = await comfyui.waitForOutputFiles(promptId, workflow.outputNodeId, workflow.outputKind);
      // Stored as <type>/<promptId>-<n>.<ext>, keeping the extension ComfyUI saved the file with.
      const urls = await Promise.all(files.map(async ({ filename, data }, index) => await saveFileToPublic(type, `${promptId}-${(index + 1).toString()}${path.extname(filename)}`, data)));

      const completedAt = new Date();
      await saveGeneration(run, { mediaType: OUTPUT_MEDIA_TYPES[workflow.outputKind], outputs: urls, startedAt, completedAt });
      // Same timings as the stored generation, so the result shows the duration before the history is fetched.
      const durationMs = completedAt.getTime() - run.createdAt.getTime();
      // TS can't see the assignment inside the progress callback, so it would narrow this to null.
      const runStartedAt = startedAt as Nullable<Date>;
      const queueWaitMs = runStartedAt === null ? null : runStartedAt.getTime() - run.createdAt.getTime();
      this.emit('message', { type: 'workflow_complete', payload: { promptId, files: urls, durationMs, queueWaitMs } });
    } catch (error) {
      logger.error(`Could not retrieve the outputs of workflow ${promptId}.`, error);
      const message = error instanceof Error ? error.message : 'Could not retrieve the workflow outputs.';
      this.emit('message', { type: 'workflow_error', payload: { promptId, message } });
    } finally {
      stopProgress();
    }
  }
}
