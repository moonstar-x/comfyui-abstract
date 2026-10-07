import { logger } from '@moonstar-x/logger';
import type { ComfyApi, QueueItem, TMonitorEvent } from '@saintno/comfyui-sdk';
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

const getMonitorUsage = (monitorData: TMonitorEvent): SystemUsage => {
  const { gpus } = monitorData;
  const vramTotal = gpus.reduce((sum, gpu) => sum + gpu.vram_total, 0);
  const vramUsed = gpus.reduce((sum, gpu) => sum + gpu.vram_used, 0);

  return {
    cpu: monitorData.cpu_utilization,
    gpu: average(gpus.map((gpu) => gpu.gpu_utilization)),
    ram: monitorData.ram_used_percent,
    vram: toPercentage(vramUsed, vramTotal)
  };
};

export class ComfyUiClientSession {
  private readonly _client: ComfyApi;

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
   * CPU, RAM and GPU utilization require the ComfyUI-Crystools extension.
   * Without it, only VRAM usage can be determined from ComfyUI's system stats.
   */
  public async getSystemUsage(): Promise<SystemUsage> {
    const { monitorData } = this._client.ext.monitor;
    if (monitorData !== false && monitorData !== undefined) {
      return getMonitorUsage(monitorData);
    }

    try {
      const { devices } = await this._client.getSystemStats();
      const vramTotal = devices.reduce((sum, device) => sum + device.vram_total, 0);
      const vramFree = devices.reduce((sum, device) => sum + device.vram_free, 0);

      return { ...EMPTY_SYSTEM_USAGE, vram: toPercentage(vramTotal - vramFree, vramTotal) };
    } catch {
      return EMPTY_SYSTEM_USAGE;
    }
  }

  public start(): this {
    this._client.init();
    return this;
  }

  private registerEventHandlers(): void {
    this._client.on('all', (event) => logger.log(event));
  }

  public static create(): ComfyUiClientSession {
    return new ComfyUiClientSession(createComfyUiClient());
  }
}
