import { logger } from '@moonstar-x/logger';
import type { ComfyApi, QueueItem } from '@saintno/comfyui-sdk';
import type { Nullable } from '../../utils/types.js';
import { createComfyUiClient } from './client.js';

/**
 * Resource usage of the ComfyUI host, in percentages (0-100).
 * A metric is null when it cannot be determined.
 */
export interface SystemUsage {
  cpu: Nullable<number>;
  gpu: Nullable<number>;
  ram: Nullable<number>;
  vram: Nullable<number>;
}

export const EMPTY_SYSTEM_USAGE: SystemUsage = { cpu: null, gpu: null, ram: null, vram: null };

const CRYSMONITOR_EVENT = 'crysmonitor.monitor';

/**
 * Payload of the websocket event sent by the ComfyUI-Crystools-MonitorOnly extension.
 * Metrics that are disabled or cannot be read are reported as -1.
 */
interface CrysMonitorData {
  cpu_utilization: number;
  gpus: Array<{
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

// ComfyUI queue items are tuples of [number, prompt_id, prompt, extra_data, outputs_to_execute].
const getQueueItemNumber = (item: QueueItem): number => Number(item[0]);
const getQueueItemPromptId = (item: QueueItem): string => {
  const promptId = item[1];
  return typeof promptId === 'string' ? promptId : '';
};

const toPercentage = (used: number, total: number): Nullable<number> => total > 0 ? (used / total) * 100 : null;

const average = (values: number[]): Nullable<number> => values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const isCrysMonitorData = (data: unknown): data is CrysMonitorData => typeof data === 'object' && data !== null && 'cpu_utilization' in data && 'ram_used_percent' in data && 'gpus' in data && Array.isArray(data.gpus);

const toMetric = (value: number): Nullable<number> => value >= 0 ? value : null;

const getMonitorUsage = (monitorData: CrysMonitorData): SystemUsage => {
  const gpuUtilizations = monitorData.gpus.map((gpu) => gpu.gpu_utilization).filter((value) => value >= 0);
  const vramGpus = monitorData.gpus.filter((gpu) => gpu.vram_total > 0 && gpu.vram_used >= 0);
  const vramTotal = vramGpus.reduce((sum, gpu) => sum + gpu.vram_total, 0);
  const vramUsed = vramGpus.reduce((sum, gpu) => sum + gpu.vram_used, 0);

  return {
    cpu: toMetric(monitorData.cpu_utilization),
    gpu: average(gpuUtilizations),
    ram: toMetric(monitorData.ram_used_percent),
    vram: toPercentage(vramUsed, vramTotal)
  };
};

export class ComfyUiClientSession {
  private readonly _client: ComfyApi;
  private _monitorData: Nullable<CrysMonitorData> = null;

  constructor(client: ComfyApi) {
    this._client = client;
    this.registerEventHandlers();
  }

  public get clientId(): string {
    return this._client.id;
  }

  public destroy(): void {
    this._client.removeAllListeners();
    this._client.destroy();
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
   * CPU, RAM and GPU utilization require the ComfyUI-Crystools-MonitorOnly extension.
   * When it does not report VRAM usage, it is determined from ComfyUI's system stats instead.
   */
  public async getSystemUsage(): Promise<SystemUsage> {
    const usage = this._monitorData ? getMonitorUsage(this._monitorData) : EMPTY_SYSTEM_USAGE;
    if (usage.vram !== null) {
      return usage;
    }

    return { ...usage, vram: await this.getSystemStatsVramUsage() };
  }

  public start(): this {
    this._client.init();
    return this;
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
    this._client.on('all', (event) => logger.log(event));

    // The SDK's monitor extension only listens for the original ComfyUI-Crystools event.
    this._client.on('all', ({ detail }) => {
      if (detail.type === CRYSMONITOR_EVENT && isCrysMonitorData(detail.data)) {
        this._monitorData = detail.data;
      }
    });

    // Stale readings should not be reported while ComfyUI is unreachable.
    this._client.on('disconnected', () => {
      this._monitorData = null;
    });
  }

  public static create(): ComfyUiClientSession {
    return new ComfyUiClientSession(createComfyUiClient());
  }
}
