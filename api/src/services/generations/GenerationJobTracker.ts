import { EventEmitter } from 'node:events';
import path from 'node:path';
import { logger } from '@moonstar-x/logger';
import type { NodeData } from '@saintno/comfyui-sdk';
import type { Nullable } from '../../utils/types.js';
import type { ActiveRun, WSServerMessage } from '../../websocket/messages/server.js';
import type { WorkflowType } from '../../workflows/types.js';
import type { ComfyUiClientSession, NodeProgress, PromptOutcome, PromptOutputs } from '../comfyui/ComfyUiClientSession.js';
import type { ComfyUiWorkflowInstance, WorkflowOutputKind } from '../comfyui/ComfyUiWorkflow.js';
import type { PromptProgressCounter } from '../comfyui/PromptProgressCounter.js';
import { database } from '../database/client/postgres.js';
import { MEDIA_TYPES } from '../database/models/generations.js';
import type { MediaType } from '../database/models/generations.js';
import { createGeneration, deleteGenerationJob, findGenerationJobs } from '../database/repositories/generations.js';
import { saveFileToPublic } from '../outputs/storage.js';
import { GenerationJob } from './GenerationJob.js';
import type { JobOutcome } from './GenerationJob.js';

// Catches the jobs whose end was missed, such as while the connection to ComfyUI was down or before the API started.
const SWEEP_INTERVAL_MS = 10_000;
// How long the result of a finished job is kept, so a client that reconnects can still be told how the runs it was following ended.
const FINISHED_RETENTION_MS = 30 * 60_000;
// ComfyUI may report a prompt before the request that queued it returns, so those events are held this long for the job to show up.
const EARLY_EVENT_RETENTION_MS = 60_000;
// Retrieving the outputs of a finished job is retried by the sweep up to this many times, in case ComfyUI could not be reached for a moment.
const MAX_OUTPUT_ATTEMPTS = 3;

const FORGOTTEN_RUN_MESSAGE = 'The server lost track of this run while you were away. If it finished, it is in the history.';

const OUTPUT_MEDIA_TYPES: Readonly<Record<WorkflowOutputKind, MediaType>> = {
  images: MEDIA_TYPES.IMAGE,
  audio: MEDIA_TYPES.AUDIO
};

interface FinishedJob {
  finishedAt: number;
  message: WSServerMessage;
  username: string;
}

interface EarlyEvents {
  finishedAt: Nullable<Date>;
  outcome: Nullable<PromptOutcome>;
  receivedAt: number;
  startedAt: Nullable<Date>;
}

interface GenerationResult {
  completedAt: Date;
  mediaType: MediaType;
  outputs: string[];
  startedAt: Nullable<Date>;
}

const latest = (...dates: Date[]): Date => new Date(Math.max(...dates.map((date) => date.getTime())));

/**
 * Moves the job to the generations. Failing to do so only loses it from the history, so the error is logged instead of failing
 * the run whose files are already saved. Returns the id of the stored generation, or null when it could not be stored.
 */
const saveGeneration = async (job: GenerationJob, result: GenerationResult): Promise<Nullable<string>> => {
  const { details } = job;
  try {
    return await database.tx(async (t) => {
      const generation = await createGeneration({
        username: details.username,
        promptId: details.promptId,
        workflowType: details.type,
        workflowId: details.workflowId,
        model: details.model,
        params: details.params,
        createdAt: details.createdAt,
        ...result
      }, t);
      await deleteGenerationJob(details.promptId, t);
      return generation.id;
    });
  } catch (error) {
    logger.error(`Could not save the generation of workflow ${details.promptId} for user ${details.username}.`, error);
    await job.delete();
    return null;
  }
};

export interface QueueGenerationJobData {
  model: string;
  /**
   * Params the prompt was built with.
   */
  params: Record<string, unknown>;
  prompt: NodeData;
  type: WorkflowType;
  username: string;
  workflow: ComfyUiWorkflowInstance;
  workflowId: string;
}

export interface GenerationJobTrackerEvents {
  /**
   * A message for every connection of the given user.
   */
  message: [username: string, message: WSServerMessage];
}

/**
 * Follows every workflow queued in ComfyUI until its outputs are saved, independently of the connections of the user who queued it.
 * Jobs are stored as soon as they are queued, so the ones still running when the API stops are picked up on the next start.
 */
export class GenerationJobTracker extends EventEmitter<GenerationJobTrackerEvents> {
  private readonly _comfyUi: ComfyUiClientSession;
  // Keyed by prompt ID.
  private readonly _earlyEvents = new Map<string, EarlyEvents>();
  private readonly _finished = new Map<string, FinishedJob>();
  private _isSweeping = false;
  private readonly _jobs = new Map<string, GenerationJob>();
  private _sweepFailed = false;
  private _sweepTimer: Nullable<NodeJS.Timeout> = null;

  private readonly handleConnected = (): void => {
    void this.sweep();
  };

  private readonly handlePromptCached = (promptId: string, nodes: string[]): void => {
    this.updateProgress(promptId, (progress) => {
      progress.addCached(nodes);
    });
  };

  private readonly handlePromptExecuting = (promptId: string, node: Nullable<string>): void => {
    this.updateProgress(promptId, (progress) => {
      progress.setExecuting(node);
    });
  };

  private readonly handlePromptFinished = (promptId: string, outcome: PromptOutcome): void => {
    const finishedAt = new Date();
    const job = this._jobs.get(promptId);
    if (job === undefined) {
      Object.assign(this.getEarlyEvents(promptId), { outcome, finishedAt });
      return;
    }

    void this.finish(job, job.toOutcome(outcome, finishedAt));
  };

  private readonly handlePromptStarted = (promptId: string): void => {
    const job = this._jobs.get(promptId);
    if (job === undefined) {
      this.getEarlyEvents(promptId).startedAt ??= new Date();
      return;
    }

    job.markStarted();
  };

  private readonly handlePromptStep = (promptId: string, step: NodeProgress): void => {
    this.updateProgress(promptId, (progress) => {
      progress.setStep(step);
    });
  };

  constructor(comfyUi: ComfyUiClientSession) {
    super();
    this._comfyUi = comfyUi;
  }

  /**
   * Cancels a run of the user, removing it from the queue or interrupting it. Returns false when the user has no such run,
   * such as when it already finished.
   */
  public async cancel(promptId: string, username: string): Promise<boolean> {
    const job = this._jobs.get(promptId);
    if (job?.username !== username) {
      return false;
    }

    if (job.isFinishing) {
      return true;
    }

    const undoCancelling = job.beginCancelling();
    try {
      await this._comfyUi.cancelPrompt(promptId);
    } catch (error) {
      undoCancelling();
      throw error;
    }

    // A running prompt reports its interruption, but one deleted from the queue is never heard of again.
    await this.reconcile([job]);
    return true;
  }

  /**
   * The runs of the user that have not finished yet, oldest first.
   */
  public getActiveRuns(username: string): ActiveRun[] {
    return this._jobs.values()
      .filter((job) => job.username === username)
      .map((job) => job.activeRun)
      .toArray()
      .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * The results of the given runs of the user that already finished, as they were sent when they did.
   * Runs that are not known at all, such as ones that finished too long ago, are reported as errors so the client stops waiting on them.
   */
  public getFinishedRunMessages(promptIds: readonly string[], username: string): WSServerMessage[] {
    return promptIds.flatMap((promptId): WSServerMessage[] => {
      if (this._jobs.has(promptId)) {
        return [];
      }

      const finished = this._finished.get(promptId);
      if (finished !== undefined) {
        return finished.username === username ? [finished.message] : [];
      }

      return [{ type: 'workflow_error', payload: { promptId, message: FORGOTTEN_RUN_MESSAGE } }];
    });
  }

  /**
   * Queues a prompt in ComfyUI for the user and starts following it. Returns its prompt ID.
   */
  public async queue({ username, type, model, workflow, workflowId, prompt, params }: QueueGenerationJobData): Promise<string> {
    const createdAt = new Date();
    const promptId = await this._comfyUi.queuePrompt(prompt);
    const job = GenerationJob.create({
      promptId,
      username,
      type,
      workflowId,
      model,
      params,
      outputNodeId: workflow.outputNodeId,
      outputKind: workflow.outputKind,
      nodeCount: Object.keys(prompt).length,
      createdAt,
      startedAt: null
    });

    this._jobs.set(promptId, job);
    // Sent before the early events are applied, so a run that already finished is never reported as queued after its result.
    this.emit('message', username, { type: 'workflow_queued', payload: { run: job.activeRun } });
    this.applyEarlyEvents(job);

    return promptId;
  }

  /**
   * Picks up the jobs left over from the last run and starts following the events of ComfyUI.
   * Call it before starting the ComfyUI session, so its first connection, which checks the leftover jobs, is not missed.
   */
  public async start(): Promise<void> {
    const rows = await findGenerationJobs();
    for (const row of rows) {
      this._jobs.set(row.prompt_id, GenerationJob.fromRow(row));
    }

    if (rows.length > 0) {
      logger.info(`Picking up ${rows.length.toString()} generation job(s) left over from the last run.`);
    }

    this._comfyUi.on('connected', this.handleConnected);
    this._comfyUi.on('prompt_started', this.handlePromptStarted);
    this._comfyUi.on('prompt_cached', this.handlePromptCached);
    this._comfyUi.on('prompt_executing', this.handlePromptExecuting);
    this._comfyUi.on('prompt_step', this.handlePromptStep);
    this._comfyUi.on('prompt_finished', this.handlePromptFinished);

    this._sweepTimer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);
  }

  public stop(): void {
    if (this._sweepTimer !== null) {
      clearInterval(this._sweepTimer);
      this._sweepTimer = null;
    }

    this._comfyUi.off('connected', this.handleConnected);
    this._comfyUi.off('prompt_started', this.handlePromptStarted);
    this._comfyUi.off('prompt_cached', this.handlePromptCached);
    this._comfyUi.off('prompt_executing', this.handlePromptExecuting);
    this._comfyUi.off('prompt_step', this.handlePromptStep);
    this._comfyUi.off('prompt_finished', this.handlePromptFinished);
  }

  private applyEarlyEvents(job: GenerationJob): void {
    const events = this._earlyEvents.get(job.promptId);
    if (events === undefined) {
      return;
    }

    this._earlyEvents.delete(job.promptId);
    if (events.startedAt !== null) {
      job.markStarted(events.startedAt);
    }

    if (events.outcome !== null) {
      void this.finish(job, job.toOutcome(events.outcome, events.finishedAt));
    }
  }

  private async finish(job: GenerationJob, outcome: JobOutcome): Promise<void> {
    if (!await job.beginFinishing()) {
      return;
    }

    const { promptId, username } = job;
    let message: Nullable<WSServerMessage>;
    switch (outcome.status) {
      case 'cancelled':
        await job.delete();
        message = { type: 'workflow_cancelled', payload: { promptId } };
        break;
      case 'error':
        await job.delete();
        message = { type: 'workflow_error', payload: { promptId, message: outcome.message } };
        break;
      case 'success':
        message = await this.saveOutputs(job, outcome.finishedAt);
        break;
    }

    // Left for the sweep to try again.
    if (message === null) {
      job.deferFinishing();
      return;
    }

    this._jobs.delete(promptId);
    this._finished.set(promptId, { finishedAt: Date.now(), message, username });
    this.emit('message', username, message);
  }

  private getEarlyEvents(promptId: string): EarlyEvents {
    let events = this._earlyEvents.get(promptId);
    if (events === undefined) {
      events = { finishedAt: null, outcome: null, receivedAt: Date.now(), startedAt: null };
      this._earlyEvents.set(promptId, events);
    }

    return events;
  }

  private pruneRetained(): void {
    const now = Date.now();
    for (const [promptId, finished] of this._finished) {
      if (now - finished.finishedAt > FINISHED_RETENTION_MS) {
        this._finished.delete(promptId);
      }
    }

    for (const [promptId, events] of this._earlyEvents) {
      if (now - events.receivedAt > EARLY_EVENT_RETENTION_MS) {
        this._earlyEvents.delete(promptId);
      }
    }
  }

  /**
   * Finishes the jobs that ComfyUI is done with, whether they ended or it has no record of them anymore.
   * Rejects if ComfyUI cannot be reached.
   */
  private async reconcile(jobs: readonly GenerationJob[]): Promise<void> {
    const states = await this._comfyUi.getPromptStates(jobs.map((job) => job.promptId));
    for (const job of jobs) {
      const state = states.get(job.promptId);
      if (state === undefined || state.status === 'pending' || state.status === 'running') {
        continue;
      }

      void this.finish(job, job.toOutcome(state, null));
    }
  }

  /**
   * Returns the message announcing the result, or null when the outputs could not be retrieved but may be on a later attempt.
   */
  private async saveOutputs(job: GenerationJob, finishedAt: Nullable<Date>): Promise<Nullable<WSServerMessage>> {
    const { promptId, type, outputNodeId, outputKind, createdAt } = job.details;
    const attempt = job.countOutputAttempt();

    let outputs: PromptOutputs;
    let urls: string[];
    try {
      outputs = await this._comfyUi.downloadOutputs(promptId, outputNodeId, outputKind);
      // Stored as <type>/<promptId>-<n>.<ext>, keeping the extension ComfyUI saved the file with.
      urls = await Promise.all(outputs.files.map(async ({ filename, data }, index) => await saveFileToPublic(type, `${promptId}-${(index + 1).toString()}${path.extname(filename)}`, data)));
    } catch (error) {
      if (attempt < MAX_OUTPUT_ATTEMPTS) {
        logger.warn(`Could not retrieve the outputs of workflow ${promptId}, trying again.`, error);
        return null;
      }

      logger.error(`Could not retrieve the outputs of workflow ${promptId}.`, error);
      await job.delete();
      return { type: 'workflow_error', payload: { promptId, message: error instanceof Error ? error.message : 'Could not retrieve the workflow outputs.' } };
    }

    // The API's clock is preferred, since the ComfyUI host's may be off. Either way, the times can't come before the job was queued.
    const startedAt = job.details.startedAt ?? (outputs.startedAt === null ? null : latest(outputs.startedAt, createdAt));
    const completedAt = latest(finishedAt ?? outputs.finishedAt ?? new Date(), startedAt ?? createdAt);
    const generationId = await saveGeneration(job, { mediaType: OUTPUT_MEDIA_TYPES[outputKind], outputs: urls, startedAt, completedAt });

    // Same timings as the stored generation, so the result shows the duration before the history is fetched.
    const durationMs = completedAt.getTime() - createdAt.getTime();
    const queueWaitMs = startedAt === null ? null : startedAt.getTime() - createdAt.getTime();
    return { type: 'workflow_complete', payload: { promptId, generationId, files: urls, durationMs, queueWaitMs } };
  }

  private async sweep(): Promise<void> {
    this.pruneRetained();

    // Only the jobs tracked by now are checked, since the ones tracked after the queue is read could be missing from it.
    const jobs = this._jobs.values().filter((job) => !job.isFinishing).toArray();
    if (this._isSweeping || jobs.length === 0) {
      return;
    }

    this._isSweeping = true;
    try {
      await this.reconcile(jobs);
      this._sweepFailed = false;
    } catch (error) {
      // Logged once per outage instead of on every sweep.
      if (!this._sweepFailed) {
        logger.warn('Could not check the generation jobs in ComfyUI, retrying until it can be reached.', error);
      }
      this._sweepFailed = true;
    } finally {
      this._isSweeping = false;
    }
  }

  private updateProgress(promptId: string, update: (progress: PromptProgressCounter) => void): void {
    const job = this._jobs.get(promptId);
    if (job === undefined || job.isFinishing) {
      return;
    }

    const progress = job.recordProgress(update);
    if (progress !== null) {
      this.emit('message', job.username, { type: 'workflow_progress', payload: { promptId, ...progress } });
    }
  }
}
