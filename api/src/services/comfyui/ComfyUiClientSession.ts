import type { ComfyApi, ImageInfo, NodeData, QueueItem } from '@saintno/comfyui-sdk';
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

type PromptResult = { message: string; status: 'error' } | { status: 'success' };

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

export class ComfyUiClientSession {
  private readonly _client: ComfyApi;
  private _monitorData: Nullable<CrysMonitorData> = null;
  // Keyed by prompt ID. Created by whichever comes first, the prompt being awaited or ComfyUI reporting its result.
  private readonly _promptResults = new Map<string, PromiseWithResolvers<PromptResult>>();

  constructor(client: ComfyApi) {
    this._client = client;
    this.registerEventHandlers();
  }

  public get clientId(): string {
    return this._client.id;
  }

  public destroy(): void {
    for (const result of this._promptResults.values()) {
      result.resolve({ status: 'error', message: 'The ComfyUI session was closed.' });
    }
    this._promptResults.clear();

    this._client.removeAllListeners();
    this._client.destroy();
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

  /**
   * Listens for the progress of a prompt queued by this session, out of the given number of nodes in it.
   * Returns a function that stops listening.
   */
  public onPromptProgress(promptId: string, total: number, listener: (progress: PromptProgress) => void): () => void {
    const completed = new Set<string>();
    let current: Nullable<string> = null;
    let step: Nullable<NodeProgress> = null;

    const notify = (): void => {
      listener({ completed: Math.min(completed.size, total), step, total });
    };

    const unsubscribers = [
      this._client.on('execution_cached', ({ detail }) => {
        if (detail.prompt_id !== promptId) {
          return;
        }

        for (const node of detail.nodes) {
          completed.add(node);
        }
        notify();
      }),
      // ComfyUI runs one node at a time, so a node starting means the previous one finished. A null node means the prompt is done.
      this._client.on('executing', ({ detail }) => {
        if (detail.prompt_id !== promptId) {
          return;
        }

        if (current !== null) {
          completed.add(current);
        }
        current = detail.node;
        step = null;
        notify();
      }),
      this._client.on('progress', ({ detail }) => {
        if (detail.prompt_id !== promptId) {
          return;
        }

        step = { value: detail.value, max: detail.max };
        notify();
      })
    ];

    return (): void => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }

  public async queuePrompt(prompt: NodeData): Promise<string> {
    const { prompt_id: promptId } = await this._client.appendPrompt(prompt);
    return promptId;
  }

  public start(): this {
    this._client.init();
    return this;
  }

  /**
   * Waits for a prompt queued by this session to finish executing and downloads the files of the given kind of the given output node.
   * ComfyUI only sends execution events to the client that queued the prompt, so this only works for prompts queued with queuePrompt().
   */
  public async waitForOutputFiles(promptId: string, outputNodeId: string, outputKind: WorkflowOutputKind): Promise<OutputFile[]> {
    const result = await this.getPromptResult(promptId).promise;
    this._promptResults.delete(promptId);
    if (result.status === 'error') {
      throw new Error(result.message);
    }

    // History is used instead of the executed event since cached nodes do not emit it.
    const history = await this._client.getHistory(promptId);
    // The SDK only types the images key, but every output kind is listed with the same shape.
    const output = history?.outputs[outputNodeId] as Partial<Record<WorkflowOutputKind, ImageInfo[]>> | undefined;
    const files = output?.[outputKind] ?? [];

    return await Promise.all(files.map(async (file) => ({ filename: file.filename, data: await this.downloadFile(file) })));
  }

  private async downloadFile(file: ImageInfo): Promise<Uint8Array> {
    const query = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder, type: file.type });
    const response = await this._client.fetchApi(`/view?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Could not download file ${file.filename} from ComfyUI (HTTP ${response.status.toString()}).`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  private getPromptResult(promptId: string): PromiseWithResolvers<PromptResult> {
    let result = this._promptResults.get(promptId);
    if (result === undefined) {
      result = Promise.withResolvers<PromptResult>();
      this._promptResults.set(promptId, result);
    }

    return result;
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

  private registerEventHandlers(): void {
    // The SDK's monitor extension only listens for the original ComfyUI-Crystools event.
    this._client.on('all', ({ detail }) => {
      if (detail.type === CRYSMONITOR_EVENT && isCrysMonitorData(detail.data)) {
        this._monitorData = detail.data;
      }
    });

    this._client.on('execution_success', ({ detail }) => {
      this.getPromptResult(detail.prompt_id).resolve({ status: 'success' });
    });

    this._client.on('execution_error', ({ detail }) => {
      this.getPromptResult(detail.prompt_id).resolve({ status: 'error', message: `${detail.node_type} failed: ${detail.exception_message}` });
    });

    this._client.on('execution_interrupted', ({ detail }) => {
      this.getPromptResult(detail.prompt_id).resolve({ status: 'error', message: 'The workflow was interrupted.' });
    });

    this._client.on('disconnected', () => {
      this._monitorData = null;
    });
  }

  public static create(): ComfyUiClientSession {
    return new ComfyUiClientSession(createComfyUiClient());
  }
}
