import type { AuthenticatedUser } from '../services/auth/session.js';
import type { ComfyUiClientSession, QueueJob } from '../services/comfyui/ComfyUiClientSession.js';
import { EMPTY_SYSTEM_USAGE } from '../services/comfyui/ComfyUiClientSession.js';
import type { GenerationJobTracker } from '../services/generations/GenerationJobTracker.js';
import { makeWorkflow } from '../workflows/factory.js';
import type { RunWorkflowPayload, WSClientMessage } from './messages/client.js';
import type { WSServerMessage } from './messages/server.js';
import { WebSocketError } from './WebSocketError.js';

export interface WebSocketMessageHandlerOptions {
  comfyUi: ComfyUiClientSession;
  jobTracker: GenerationJobTracker;
}

/**
 * Answers the messages of every connection. Messages that are not a direct response, such as a workflow finishing, are sent by the job tracker.
 */
export class WebSocketMessageHandler {
  private readonly _comfyUi: ComfyUiClientSession;
  private readonly _jobTracker: GenerationJobTracker;

  constructor(options: WebSocketMessageHandlerOptions) {
    this._comfyUi = options.comfyUi;
    this._jobTracker = options.jobTracker;
  }

  public async handle(message: WSClientMessage, user: AuthenticatedUser): Promise<WSServerMessage[]> {
    switch (message.type) {
      case 'cancel_run':
        return await this.handleCancelRun(message.payload.promptId, user);
      case 'comfyui_free_up_memory':
        return [await this.handleFreeUpMemory()];
      case 'get_queue':
        return [await this.handleGetQueue(message.payload?.promptId)];
      case 'get_runs':
        return this.handleGetRuns(message.payload?.promptIds ?? [], user);
      case 'get_status':
        return [await this.handleGetStatus()];
      case 'run_workflow':
        return [await this.handleRunWorkflow(message.payload, user)];
    }
  }

  /**
   * The cancellation itself is announced by the job tracker once ComfyUI drops the run.
   */
  private async handleCancelRun(promptId: string, { username }: AuthenticatedUser): Promise<WSServerMessage[]> {
    let isCancelled: boolean;
    try {
      isCancelled = await this._jobTracker.cancel(promptId, username);
    } catch (error) {
      throw new WebSocketError('Could not cancel the workflow in ComfyUI.', { cause: error });
    }

    if (!isCancelled) {
      throw new WebSocketError('The workflow has already finished.');
    }

    return [];
  }

  private async handleFreeUpMemory(): Promise<WSServerMessage> {
    if (!await this._comfyUi.freeMemory()) {
      throw new WebSocketError('Could not free up the memory in ComfyUI.');
    }

    return { type: 'comfyui_memory_freed', payload: {} };
  }

  private async handleGetQueue(promptId?: string): Promise<WSServerMessage> {
    let queue: QueueJob[];
    try {
      queue = await this._comfyUi.getQueue();
    } catch (error) {
      throw new WebSocketError('Could not retrieve the queue from ComfyUI.', { cause: error });
    }

    const running = queue.filter((job) => job.processing).length;
    const index = promptId === undefined ? -1 : queue.findIndex((job) => job.promptId === promptId);
    const job = queue.at(index);
    const jobStatus = index !== -1 && job !== undefined ? { ...job, position: index + 1 } : null;

    return { type: 'queue', payload: { size: queue.length, running, pending: queue.length - running, job: jobStatus } };
  }

  /**
   * The active runs come first, so the results of the finished ones settle runs the client already knows about.
   */
  private handleGetRuns(promptIds: string[], { username }: AuthenticatedUser): WSServerMessage[] {
    return [
      { type: 'runs', payload: { runs: this._jobTracker.getActiveRuns(username) } },
      ...this._jobTracker.getFinishedRunMessages(promptIds, username)
    ];
  }

  private async handleGetStatus(): Promise<WSServerMessage> {
    const isOnlineState = await this._comfyUi.getOnlineState();
    const usage = isOnlineState ? await this._comfyUi.getSystemUsage() : EMPTY_SYSTEM_USAGE;

    return { type: 'status', payload: { online: isOnlineState, usage } };
  }

  private async handleRunWorkflow({ params, ...request }: RunWorkflowPayload, { username }: AuthenticatedUser): Promise<WSServerMessage> {
    const { workflow, workflowId, params: workflowParams } = makeWorkflow(request, params);
    const { prompt, params: resolvedParams } = workflow.makePrompt(workflowParams);

    let promptId: string;
    try {
      promptId = await this._jobTracker.queue({ ...request, username, workflow, workflowId, prompt, params: { ...resolvedParams } });
    } catch (error) {
      throw new WebSocketError('Could not queue the workflow in ComfyUI.', { cause: error });
    }

    return { type: 'workflow_start', payload: { promptId } };
  }
}
