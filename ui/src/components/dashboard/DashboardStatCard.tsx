import type { NavCategory } from '@components/ui/app/navigation';
import { CATEGORY_TILE_CLASSES } from '@components/ui/app/navigation';
import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import type { FC } from 'react';

export interface DashboardStatCardProps {
  category: NavCategory;
  className?: string;
  description: string;
  icon: LucideIcon;
  label: string;
  value: number;
}

export const DashboardStatCard: FC<DashboardStatCardProps> = ({ category, className, description, icon: Icon, label, value }) => (
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
    </div>
  </section>
);
