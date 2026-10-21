import type { NavCategory } from '@components/ui/app/navigation';
import { CATEGORY_TILE_CLASSES } from '@components/ui/app/navigation';
import { cn } from 'cn';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FC } from 'react';

export interface StatChange {
  /**
   * What the value is compared against, e.g. "yesterday".
   */
  label: string;
  previous: number;
}

export interface DashboardStatCardProps {
  category: NavCategory;
  change?: StatChange;
  className?: string;
  description: string;
  icon: LucideIcon;
  label: string;
  value: number;
}

const describeChange = (value: number, previous: number): string => {
  const difference = value - previous;
  if (difference === 0) {
    return 'No change';
  }

  const sign = difference > 0 ? '+' : '−';

  // A percentage of nothing is meaningless, so a change from zero shows the raw difference instead.
  if (previous === 0) {
    return `${sign}${Math.abs(difference).toLocaleString()}`;
  }

  return `${sign}${Math.round(Math.abs(difference / previous) * 100).toLocaleString()}%`;
};

const StatChangeLabel: FC<{ change: StatChange; value: number }> = ({ change, value }) => {
  const difference = value - change.previous;
  const Icon = difference > 0 ? ArrowUpRight : (difference < 0 ? ArrowDownRight : ArrowRight);

  return (
    <p
      className="flex items-center gap-1 text-xs text-muted-foreground"
      title={`${value.toLocaleString()} now, ${change.previous.toLocaleString()} at this point ${change.label}`}
    >
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium',
          difference > 0 && 'text-status-online-foreground',
          difference < 0 && 'text-status-offline-foreground'
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        {describeChange(value, change.previous)}
      </span>
      <span className="truncate">{`vs ${change.label}`}</span>
    </p>
  );
};

export const DashboardStatCard: FC<DashboardStatCardProps> = ({ category, change, className, description, icon: Icon, label, value }) => (
  <section className={cn('flex flex-col gap-3 rounded-xl border p-4', className)}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4', CATEGORY_TILE_CLASSES[category])}>
        <Icon aria-hidden="true" />
      </span>
    </div>
    <div className="flex flex-col gap-0.5">
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {change !== undefined && <StatChangeLabel change={change} value={value} />}
    </div>
  </section>
);
