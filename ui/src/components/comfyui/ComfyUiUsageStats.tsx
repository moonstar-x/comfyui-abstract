import { Badge } from '@components/ui/third-party/shadcn/badge';
import type { Nullable } from '@core/utils/types';
import type { SystemUsage } from '@services/websocket/messages/server';
import { cn } from 'cn';
import type { FC } from 'react';

interface UsageMetric {
  key: keyof SystemUsage;
  label: string;
}

const USAGE_METRICS: UsageMetric[] = [
  { key: 'cpu', label: 'CPU' },
  { key: 'ram', label: 'RAM' },
  { key: 'gpu', label: 'GPU' },
  { key: 'vram', label: 'VRAM' }
];

const HIGH_USAGE_THRESHOLD = 90;

const clampPercentage = (value: number): number => Math.min(100, Math.max(0, value));

interface UsageStatProps {
  label: string;
  value: Nullable<number>;
}

const UsageStat: FC<UsageStatProps> = ({ label, value }) => {
  if (value === null) {
    return null;
  }

  const percentage = Math.round(clampPercentage(value));
  const percentageText = `${percentage.toString()}%`;
  const isHigh = percentage >= HIGH_USAGE_THRESHOLD;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5 text-xs leading-none">
        <span className="font-medium text-muted-foreground">
          {label}
          <span className="sr-only"> usage</span>
        </span>
        <span className={cn('min-w-[3ch] text-right font-medium tabular-nums', isHigh && 'text-status-offline-foreground')}>
          {percentageText}
        </span>
      </div>
      <div aria-hidden="true" className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', isHigh ? 'bg-status-offline' : 'bg-foreground/40')}
          style={{ width: percentageText }}
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
    <Badge className="hidden h-8 gap-3 rounded-full border-border bg-background px-3 md:inline-flex dark:border-input dark:bg-input/30" variant="outline">
      {metrics.map(({ key, label }) => <UsageStat key={key} label={label} value={usage[key]} />)}
    </Badge>
  );
};
