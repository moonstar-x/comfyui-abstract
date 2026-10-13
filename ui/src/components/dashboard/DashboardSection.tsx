import { cn } from 'cn';
import type { FC, ReactNode } from 'react';

export interface DashboardSectionProps {
  /**
   * Shown on the right of the heading, e.g. a total.
   */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  description: string;
  title: string;
}

export const DashboardSection: FC<DashboardSectionProps> = ({ aside, children, className, description, title }) => (
  <section className={cn('flex min-w-0 flex-col gap-3 rounded-xl border p-4 md:p-6', className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {aside}
    </div>
    {children}
  </section>
);

export const DashboardEmptyState: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
);
