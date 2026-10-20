import { Badge } from '@components/ui/third-party/shadcn/badge';
import type { Nullable } from '@core/utils/types';
import type { SystemUsage } from '@services/websocket/messages/server';
import { cn } from 'cn';
import type { FC } from 'react';

interface UsageMetric {
  description: string;
  highThreshold: number;
  key: keyof SystemUsage;
  label: string;
  unit: string;
}

// Temperature is in degrees Celsius, its bar is drawn on a 0-100°C scale.
const USAGE_METRICS: UsageMetric[] = [
  { key: 'cpu', label: 'CPU', unit: '%', description: 'usage', highThreshold: 90 },
  { key: 'ram', label: 'RAM', unit: '%', description: 'usage', highThreshold: 90 },
  { key: 'gpu', label: 'GPU', unit: '%', description: 'usage', highThreshold: 90 },
  { key: 'vram', label: 'VRAM', unit: '%', description: 'usage', highThreshold: 90 },
  { key: 'temperature', label: 'TEMP', unit: '°C', description: 'GPU temperature', highThreshold: 80 }
];

const clampPercentage = (value: number): number => Math.min(100, Math.max(0, value));

interface UsageStatProps {
  metric: UsageMetric;
  value: Nullable<number>;
}

const UsageStat: FC<UsageStatProps> = ({ metric, value }) => {
  if (value === null) {
    return null;
  }

  const { description, highThreshold, label, unit } = metric;
  const roundedValue = Math.round(value);
  const valueText = `${roundedValue.toString()}${unit}`;
  const barWidth = `${clampPercentage(roundedValue).toString()}%`;
  const isHigh = roundedValue >= highThreshold;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5 text-xs leading-none">
        <span className="font-medium text-muted-foreground">
          {label}
          <span className="sr-only">{` ${description}`}</span>
        </span>
        <span className={cn('min-w-[3ch] text-right font-medium tabular-nums', isHigh && 'text-status-offline-foreground')}>
          {valueText}
        </span>
      </div>
      <div aria-hidden="true" className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', isHigh ? 'bg-status-offline' : 'bg-foreground/40')}
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
};

export interface ComfyUiUsageStatsProps {
  usage: SystemUsage;
}

export const ComfyUiUsageStats: FC<ComfyUiUsageStatsProps> = ({ usage }) => {
  const metrics = USAGE_METRICS.filter(({ key }) => usage[key] !== null);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Badge className="hidden h-8 gap-3 rounded-full border-border bg-background px-3 page-md:inline-flex dark:border-input dark:bg-input/30" variant="outline">
      {metrics.map((metric) => <UsageStat key={metric.key} metric={metric} value={usage[metric.key]} />)}
    </Badge>
  );
};
