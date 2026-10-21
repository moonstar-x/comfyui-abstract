import { logger } from '@moonstar-x/logger';
import type { Nullable } from '../../utils/types.js';
import type { ActiveRun } from '../../websocket/messages/server.js';
import type { WorkflowType } from '../../workflows/types.js';
import type { PromptOutcome, PromptProgress } from '../comfyui/ComfyUiClientSession.js';
import type { WorkflowOutputKind } from '../comfyui/ComfyUiWorkflow.js';
import { PromptProgressCounter } from '../comfyui/PromptProgressCounter.js';
import type { GenerationJobRow } from '../database/models/generations.js';
import { createGenerationJob, deleteGenerationJob, setGenerationJobStartedAt } from '../database/repositories/generations.js';

const LOST_JOB_MESSAGE = 'ComfyUI no longer has the workflow in its queue or history, it may have been restarted.';

/**
 * How a job ended, from the user's point of view.
 */
export type JobOutcome = { finishedAt: Nullable<Date>; status: 'success' } | { message: string; status: 'error' } | { status: 'cancelled' };

export interface GenerationJobDetails {
  createdAt: Date;
  model: string;
  /**
   * Number of nodes in the queued prompt, which the progress is counted against.
   */
  nodeCount: number;
  outputKind: WorkflowOutputKind;
  outputNodeId: string;
  /**
   * Params the prompt was built with.
   */
  params: Record<string, unknown>;
  promptId: string;
  startedAt: Nullable<Date>;
  type: WorkflowType;
  username: string;
  workflowId: string;
}

/**
 * A workflow queued in ComfyUI, followed until its outputs are saved.
 */
export class GenerationJob {
  public readonly details: GenerationJobDetails;
  private _isCancelling = false;
  private _isFinishing = false;
  private _outputAttempts = 0;
  // Settles once the job is stored, whether it could be or not. A job deleted before it is stored would be left behind otherwise.
  private readonly _persisted: Promise<void>;
  private readonly _progress: PromptProgressCounter;

  private constructor(details: GenerationJobDetails, persisted: Promise<void>) {
    this.details = details;
    this._persisted = persisted;
    this._progress = new PromptProgressCounter(details.nodeCount);
  }

  public get activeRun(): ActiveRun {
    return {
      promptId: this.details.promptId,
      type: this.details.type,
      model: this.details.model,
      createdAt: this.details.createdAt,
      progress: this._progress.progress
    };
  }

  public get isFinishing(): boolean {
    return this._isFinishing;
  }

  public get promptId(): string {
    return this.details.promptId;
  }

  public get username(): string {
    return this.details.username;
  }

  /**
   * Marks the job as being cancelled by the user, so its interruption or removal from the queue counts as a cancellation instead of a failure.
   * Returns a function that undoes it, for when the cancellation could not be requested.
   */
  public beginCancelling(): () => void {
    this._isCancelling = true;
    return (): void => {
      this._isCancelling = false;
    };
  }

  /**
   * Returns false when the job is already being finished, so the events and the sweep don't finish it twice.
   * Otherwise, the job is not finished until it is stored.
   */
  public async beginFinishing(): Promise<boolean> {
    if (this._isFinishing) {
      return false;
    }

    this._isFinishing = true;
    await this._persisted;
    return true;
  }

  /**
   * Counts an attempt at retrieving the outputs and returns how many there have been.
   */
  public countOutputAttempt(): number {
    this._outputAttempts += 1;
    return this._outputAttempts;
  }

  /**
   * Leaves the job to be finished again later, such as when its outputs could not be retrieved yet.
   */
  public deferFinishing(): void {
    this._isFinishing = false;
  }

  /**
   * Removes the stored job, such as once it failed. A job that could not be removed is checked again on the next start.
   */
  public async delete(): Promise<void> {
    try {
      await deleteGenerationJob(this.promptId);
    } catch (error) {
      logger.error(`Could not delete the generation job of workflow ${this.promptId}, it will be checked again on the next start.`, error);
    }
  }

  /**
   * Records the moment ComfyUI picked the job from the queue. Only the first one counts.
   */
  public markStarted(startedAt: Date = new Date()): void {
    if (this.details.startedAt !== null) {
      return;
    }

    this.details.startedAt = startedAt;
    void (async (): Promise<void> => {
      await this._persisted;
      try {
        await setGenerationJobStartedAt(this.promptId, startedAt);
      } catch (error) {
        logger.error(`Could not store the start time of the generation job of workflow ${this.promptId}.`, error);
      }
    })();
  }

  /**
   * Counts an execution event and returns the progress it adds up to.
   */
  public recordProgress(update: (progress: PromptProgressCounter) => void): Nullable<PromptProgress> {
    update(this._progress);
    // The first progress event is sent once ComfyUI picks the prompt from the queue, which marks the end of the wait in the queue.
    this.markStarted();
    return this._progress.progress;
  }

  public toOutcome(outcome: PromptOutcome | { status: 'unknown' }, finishedAt: Nullable<Date>): JobOutcome {
    switch (outcome.status) {
      case 'error':
        return outcome;
      case 'interrupted':
        return this._isCancelling ? { status: 'cancelled' } : { status: 'error', message: 'The workflow was interrupted.' };
      case 'success':
        return { status: 'success', finishedAt };
      case 'unknown':
        // ComfyUI forgets a pending prompt once it is deleted from the queue, which is how cancelling one works.
        return this._isCancelling ? { status: 'cancelled' } : { status: 'error', message: LOST_JOB_MESSAGE };
    }
  }

  /**
   * A job queued just now. It is stored in the background, so the events ComfyUI sends in the meantime are not missed.
   * A job that could not be stored still runs, but is lost if the API restarts before it finishes.
   */
  public static create(details: GenerationJobDetails): GenerationJob {
    const persisted = (async (): Promise<void> => {
      try {
        await createGenerationJob({ ...details, workflowType: details.type });
      } catch (error) {
        logger.error(`Could not store the generation job of workflow ${details.promptId}, it will be lost if the API restarts before it finishes.`, error);
      }
    })();

    return new GenerationJob(details, persisted);
  }

  public static fromRow(row: GenerationJobRow): GenerationJob {
    return new GenerationJob({
      promptId: row.prompt_id,
      username: row.username,
      type: row.workflow_type,
      workflowId: row.workflow_id,
      model: row.model,
      params: row.params,
      outputNodeId: row.output_node_id,
      outputKind: row.output_kind,
      nodeCount: row.node_count,
      createdAt: row.created_at,
      startedAt: row.started_at
    }, Promise.resolve());
  }
}
