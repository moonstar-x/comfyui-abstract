import { logger } from '@moonstar-x/logger';
import type { ComfyApi, TMonitorEvent } from '@saintno/comfyui-sdk';
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
