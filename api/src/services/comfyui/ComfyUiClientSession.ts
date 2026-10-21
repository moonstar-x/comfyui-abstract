import { EventEmitter } from 'node:events';
import { logger } from '@moonstar-x/logger';
import { ComfyApi } from '@saintno/comfyui-sdk';
import type { HistoryEntry, ImageInfo, NodeData, QueueItem } from '@saintno/comfyui-sdk';
import type { Nullable } from '../../utils/types.js';
import { createComfyUiClient } from './client.js';
import type { WorkflowOutputKind } from './ComfyUiWorkflow.js';

/**
 * Resource usage of the ComfyUI host, in percentages (0-100), except for temperature which is in degrees Celsius.
 * A metric is null when it cannot be determined.
 */
export interface SystemUsage {
  cpu: Nullable<number>;
  gpu: Nullable<number>;
  ram: Nullable<number>;
  temperature: Nullable<number>;
  vram: Nullable<number>;
}

export const EMPTY_SYSTEM_USAGE: SystemUsage = { cpu: null, gpu: null, ram: null, temperature: null, vram: null };

const CRYSMONITOR_EVENT = 'crysmonitor.monitor';

/**
 * Payload of the websocket event sent by the ComfyUI-Crystools-MonitorOnly extension.
 * Metrics that are disabled or cannot be read are reported as -1.
 */
interface CrysMonitorData {
  cpu_utilization: number;
  gpus: Array<{
    gpu_temperature: number;
    gpu_utilization: number;
    vram_total: number;
    vram_used: number;
  }>;
  ram_used_percent: number;
}

/**
 * A job in the ComfyUI queue, identified by its prompt ID.
 * Jobs are ordered with the running ones first, followed by the pending ones in execution order.
 */
export interface QueueJob {
  processing: boolean;
  promptId: string;
}

/**
 * A file produced by a workflow, such as an image or audio, downloaded from ComfyUI.
 */
export interface OutputFile {
  data: Uint8Array;
  filename: string;
}

/**
 * Progress of the node currently executing in a prompt, such as the steps of a sampler.
 */
export interface NodeProgress {
  max: number;
  value: number;
}

/**
 * Progress of a whole prompt, counted in nodes. Cached nodes count as completed.
 * The step is the progress of the node currently executing, null when it does not report any.
 */
export interface PromptProgress {
  completed: number;
  step: Nullable<NodeProgress>;
  total: number;
}

/**
 * How a prompt ended. Interrupted prompts are told apart from failed ones, since an interruption may be a cancellation.
 */
export type PromptOutcome = { message: string; status: 'error' } | { status: 'interrupted' } | { status: 'success' };

/**
 * Where a prompt is according to the ComfyUI queue and history. Unknown means ComfyUI has no record of it, such as when it was
 * removed from the queue or ComfyUI restarted, since the history only lives in its memory.
 */
export type PromptState = PromptOutcome | { status: 'pending' } | { status: 'running' } | { status: 'unknown' };

/**
 * The files of a finished prompt, and when ComfyUI says it started and finished it, by the clock of the ComfyUI host.
 */
export interface PromptOutputs {
  files: OutputFile[];
  finishedAt: Nullable<Date>;
  startedAt: Nullable<Date>;
}

export interface ComfyUiClientSessionEvents {
  /**
   * The websocket opened, either for the first time or after a drop. Events sent while it was down are lost.
   */
  connected: [];
  prompt_cached: [promptId: string, nodes: string[]];
  /**
   * A node of the prompt started executing. A null node means the prompt is done.
   */
  prompt_executing: [promptId: string, node: Nullable<string>];
  prompt_finished: [promptId: string, outcome: PromptOutcome];
  prompt_started: [promptId: string];
  prompt_step: [promptId: string, step: NodeProgress];
}

// A client that could not connect, or gave up reconnecting, is replaced with a new one after this delay.
const CLIENT_RETRY_DELAY_MS = 15_000;
// Dispatched by the SDK once it gives up reconnecting, but missing from its event map.
const RECONNECTION_FAILED_EVENT = 'reconnection_failed';

// ComfyUI queue items are tuples of [number, prompt_id, prompt, extra_data, outputs_to_execute].
const getQueueItemNumber = (item: QueueItem): number => Number(item[0]);
const getQueueItemPromptId = (item: QueueItem): string => {
  const promptId = item[1];
  return typeof promptId === 'string' ? promptId : '';
};

const toPercentage = (used: number, total: number): Nullable<number> => total > 0 ? (used / total) * 100 : null;
const average = (values: number[]): Nullable<number> => values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const maximum = (values: number[]): Nullable<number> => values.length > 0 ? Math.max(...values) : null;
const isCrysMonitorData = (data: unknown): data is CrysMonitorData => typeof data === 'object' && data !== null && 'cpu_utilization' in data && 'ram_used_percent' in data && 'gpus' in data && Array.isArray(data.gpus);
const toMetric = (value: number): Nullable<number> => value >= 0 ? value : null;

const getMonitorUsage = (monitorData: CrysMonitorData): SystemUsage => {
  const gpuUtilizations = monitorData.gpus.map((gpu) => gpu.gpu_utilization).filter((value) => value >= 0);
  const gpuTemperatures = monitorData.gpus.map((gpu) => gpu.gpu_temperature).filter((value) => value >= 0);
  const vramGpus = monitorData.gpus.filter((gpu) => gpu.vram_total > 0 && gpu.vram_used >= 0);
  const vramTotal = vramGpus.reduce((sum, gpu) => sum + gpu.vram_total, 0);
  const vramUsed = vramGpus.reduce((sum, gpu) => sum + gpu.vram_used, 0);

  return {
    cpu: toMetric(monitorData.cpu_utilization),
    gpu: average(gpuUtilizations),
    ram: toMetric(monitorData.ram_used_percent),
    temperature: maximum(gpuTemperatures),
    vram: toPercentage(vramUsed, vramTotal)
  };
};

const formatExecutionError = (nodeType: unknown, exceptionMessage: unknown): string => `${String(nodeType)} failed: ${String(exceptionMessage)}`;

// The history keeps the execution events of a prompt as [type, data] pairs, with the time they were sent in milliseconds.
const findHistoryMessage = (entry: HistoryEntry, type: string): Record<string, unknown> | undefined => entry.status.messages.find(([messageType]) => messageType === type)?.[1];

const getHistoryTimestamp = (entry: HistoryEntry, type: string): Nullable<Date> => {
  const timestamp = findHistoryMessage(entry, type)?.['timestamp'];
  return typeof timestamp === 'number' ? new Date(timestamp) : null;
};

const getHistoryOutcome = (entry: HistoryEntry): PromptOutcome => {
  if (entry.status.status_str === 'success') {
    return { status: 'success' };
  }

  if (findHistoryMessage(entry, 'execution_interrupted') !== undefined) {
    return { status: 'interrupted' };
  }

  const error = findHistoryMessage(entry, 'execution_error');
  return { status: 'error', message: error === undefined ? 'The workflow failed in ComfyUI.' : formatExecutionError(error['node_type'], error['exception_message']) };
};

/**
 * The single connection the API keeps to ComfyUI, shared by every user. Prompts are queued under its client ID, so ComfyUI sends
 * their events here no matter which browser connection asked for them.
 */
export class ComfyUiClientSession extends EventEmitter<ComfyUiClientSessionEvents> {
  private _client: ComfyApi;
  private readonly _clientId: string;
  private _isDestroyed = false;
  private _monitorData: Nullable<CrysMonitorData> = null;
  private _retryTimer: Nullable<NodeJS.Timeout> = null;

  constructor(clientId: string) {
    super();
    this._clientId = clientId;
    this._client = this.createClient();
  }

  public get clientId(): string {
    return this._clientId;
  }

  /**
   * Removes a pending prompt from the queue, or interrupts it if it is running.
   * Returns false when it is in neither, such as when it already finished.
   */
  public async cancelPrompt(promptId: string): Promise<boolean> {
    const queue = await this.getQueue();
    const job = queue.find((item) => item.promptId === promptId);
    if (job === undefined) {
      return false;
    }

    if (job.processing) {
      // Newer ComfyUI versions only interrupt the given prompt, in case the next one started in the meantime. Older ones ignore it
      // and interrupt whatever is running, which is still this prompt unless it finished since the queue was read.
      // eslint-disable-next-line camelcase
      await this.post('/interrupt', { prompt_id: promptId });
    } else {
      await this.post('/queue', { delete: [promptId] });
    }

    return true;
  }

  public destroy(): void {
    this._isDestroyed = true;
    if (this._retryTimer !== null) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }

    this._client.removeAllListeners();
    this._client.destroy();
  }

  /**
   * Downloads the files of the given kind of the given output node of a finished prompt.
   */
  public async downloadOutputs(promptId: string, outputNodeId: string, outputKind: WorkflowOutputKind): Promise<PromptOutputs> {
    // History is used instead of the executed event since cached nodes do not emit it.
    const history = await this._client.getHistory(promptId);
    if (history === undefined) {
      throw new Error('ComfyUI has no record of the workflow.');
    }

    // The SDK only types the images key, but every output kind is listed with the same shape.
    const output = history.outputs[outputNodeId] as Partial<Record<WorkflowOutputKind, ImageInfo[]>> | undefined;
    const files = await Promise.all((output?.[outputKind] ?? []).map(async (file) => ({ filename: file.filename, data: await this.downloadFile(file) })));

    return { files, startedAt: getHistoryTimestamp(history, 'execution_start'), finishedAt: getHistoryTimestamp(history, 'execution_success') };
  }

  /**
   * Unloads the models and frees the memory cached by ComfyUI. Returns whether ComfyUI accepted the request.
   */
  public async freeMemory(): Promise<boolean> {
    return await this._client.freeMemory(true, true);
  }

  public async getOnlineState(): Promise<boolean> {
    try {
      const { status } = await this._client.ping();
      return status;
    } catch {
      return false;
    }
  }

  /**
   * Looks the prompts up in the queue, and the ones that are not there in the history. Rejects if ComfyUI cannot be reached,
   * so a prompt is only ever reported as unknown when ComfyUI itself says so.
   */
  public async getPromptStates(promptIds: readonly string[]): Promise<Map<string, PromptState>> {
    const queue = await this.getQueue();
    const queued = new Map(queue.map((job) => [job.promptId, job]));

    // Read after the queue, so a prompt that finishes in between is found in the history instead of being missed by both.
    const entries = await Promise.all(promptIds.map(async (promptId): Promise<[string, PromptState]> => {
      const job = queued.get(promptId);
      if (job !== undefined) {
        return [promptId, { status: job.processing ? 'running' : 'pending' }];
      }

      const history = await this._client.getHistory(promptId);
      return [promptId, history === undefined ? { status: 'unknown' } : getHistoryOutcome(history)];
    }));

    return new Map(entries);
  }

  public async getQueue(): Promise<QueueJob[]> {
    const { queue_running: running, queue_pending: pending } = await this._client.getQueue();
    // ComfyUI does not guarantee the pending queue is sorted, it's ordered by the item number instead.
    const sortedPending = pending.toSorted((a, b) => getQueueItemNumber(a) - getQueueItemNumber(b));

    return [
      ...running.map((item) => ({ processing: true, promptId: getQueueItemPromptId(item) })),
      ...sortedPending.map((item) => ({ processing: false, promptId: getQueueItemPromptId(item) }))
    ];
  }

  /**
   * CPU, RAM, GPU utilization and GPU temperature require the ComfyUI-Crystools-MonitorOnly extension.
   * When it does not report VRAM usage, it is determined from ComfyUI's system stats instead.
   */
  public async getSystemUsage(): Promise<SystemUsage> {
    const usage = this._monitorData ? getMonitorUsage(this._monitorData) : EMPTY_SYSTEM_USAGE;
    if (usage.vram !== null) {
      return usage;
    }

    return { ...usage, vram: await this.getSystemStatsVramUsage() };
  }

  public async queuePrompt(prompt: NodeData): Promise<string> {
    const { prompt_id: promptId } = await this._client.appendPrompt(prompt);
    return promptId;
  }

  public start(): this {
    this._client.init();
    return this;
  }

  private createClient(): ComfyApi {
    const client = createComfyUiClient(this._clientId);
    this.registerEventHandlers(client);
    return client;
  }

  private async downloadFile(file: ImageInfo): Promise<Uint8Array> {
    const query = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder, type: file.type });
    const response = await this._client.fetchApi(`/view?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Could not download file ${file.filename} from ComfyUI (HTTP ${response.status.toString()}).`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  private async getSystemStatsVramUsage(): Promise<Nullable<number>> {
    try {
      const { devices } = await this._client.getSystemStats();
      const vramTotal = devices.reduce((sum, device) => sum + device.vram_total, 0);
      const vramFree = devices.reduce((sum, device) => sum + device.vram_free, 0);

      return toPercentage(vramTotal - vramFree, vramTotal);
    } catch {
      return null;
    }
  }

  private async post(route: string, body: object): Promise<void> {
    const response = await this._client.fetchApi(route, { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) {
      throw new Error(`ComfyUI rejected the request to ${route} (HTTP ${response.status.toString()}).`);
    }
  }

  private registerEventHandlers(client: ComfyApi): void {
    // The SDK's monitor extension only listens for the original ComfyUI-Crystools event.
    client.on('all', ({ detail }) => {
      if (detail.type === CRYSMONITOR_EVENT && isCrysMonitorData(detail.data)) {
        this._monitorData = detail.data;
      }
    });

    client.on('connected', () => {
      this.emit('connected');
    });

    client.on('reconnected', () => {
      this.emit('connected');
    });

    client.on('disconnected', () => {
      this._monitorData = null;
    });

    // The SDK gives up after a number of attempts, both when connecting for the first time and when reconnecting.
    client.on('connection_error', ({ detail }) => {
      logger.warn(`Could not connect to ComfyUI, retrying in ${(CLIENT_RETRY_DELAY_MS / 1000).toString()} seconds.`, detail);
      this.scheduleClientReplacement(client);
    });

    client.addEventListener(RECONNECTION_FAILED_EVENT, () => {
      logger.warn(`Lost the connection to ComfyUI, retrying in ${(CLIENT_RETRY_DELAY_MS / 1000).toString()} seconds.`);
      this.scheduleClientReplacement(client);
    });

    client.on('execution_start', ({ detail }) => {
      this.emit('prompt_started', detail.prompt_id);
    });

    client.on('execution_cached', ({ detail }) => {
      this.emit('prompt_cached', detail.prompt_id, detail.nodes);
    });

    client.on('executing', ({ detail }) => {
      this.emit('prompt_executing', detail.prompt_id, detail.node);
    });

    client.on('progress', ({ detail }) => {
      this.emit('prompt_step', detail.prompt_id, { value: detail.value, max: detail.max });
    });

    client.on('execution_success', ({ detail }) => {
      this.emit('prompt_finished', detail.prompt_id, { status: 'success' });
    });

    client.on('execution_error', ({ detail }) => {
      this.emit('prompt_finished', detail.prompt_id, { status: 'error', message: formatExecutionError(detail.node_type, detail.exception_message) });
    });

    client.on('execution_interrupted', ({ detail }) => {
      this.emit('prompt_finished', detail.prompt_id, { status: 'interrupted' });
    });
  }

  /**
   * Replaces a client the SDK gave up on with a new one under the same client ID, after a delay.
   */
  private scheduleClientReplacement(client: ComfyApi): void {
    if (this._isDestroyed || client !== this._client || this._retryTimer !== null) {
      return;
    }

    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      if (this._isDestroyed) {
        return;
      }

      this._client.removeAllListeners();
      this._client.destroy();
      this._monitorData = null;
      this._client = this.createClient();
      this._client.init();
    }, CLIENT_RETRY_DELAY_MS);
  }

  public static create(): ComfyUiClientSession {
    return new ComfyUiClientSession(ComfyApi.generateId());
  }
}
