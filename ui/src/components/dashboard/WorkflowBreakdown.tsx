import { DashboardEmptyState, DashboardSection } from '@components/dashboard/DashboardSection';
import { formatGenerationCount, formatShare } from '@components/dashboard/format';
import { ShareBar } from '@components/dashboard/ShareBar';
import { CATEGORY_TILE_CLASSES, findWorkflowNavItem } from '@components/ui/app/navigation';
import type { GenerationWorkflowCount } from '@services/api/dashboard';
import { cn } from 'cn';
import { Workflow } from 'lucide-react';
import type { FC } from 'react';

interface WorkflowRowProps {
  count: GenerationWorkflowCount;
  maxCount: number;
  total: number;
}

const WorkflowRow: FC<WorkflowRowProps> = ({ count, maxCount, total }) => {
  const navItem = findWorkflowNavItem(count.workflowType);
  const Icon = navItem?.icon ?? Workflow;

  return (
    <li className="flex items-center gap-3 py-2">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4', CATEGORY_TILE_CLASSES[navItem?.category ?? count.mediaType])}>
        <Icon aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-sm leading-none">
          <span className="truncate font-medium">{navItem?.title ?? count.workflowType}</span>
          <span className="shrink-0 tabular-nums">
            <span className="font-medium">{formatGenerationCount(count.generationCount)}</span>
            <span className="text-muted-foreground">{` · ${formatShare(count.generationCount, total)}`}</span>
          </span>
        </div>
        <ShareBar max={maxCount} value={count.generationCount} />
      </div>
    </li>
  );
};

export interface WorkflowBreakdownProps {
  workflows: GenerationWorkflowCount[];
}

export const WorkflowBreakdown: FC<WorkflowBreakdownProps> = ({ workflows }) => {
  const total = workflows.reduce((sum, count) => sum + count.generationCount, 0);
  const maxCount = workflows[0]?.generationCount ?? 0;

  return (
    <DashboardSection description="How many generations each workflow has made." title="Workflows">
      {workflows.length === 0
        ? <DashboardEmptyState>No workflow has been used yet</DashboardEmptyState>
        : (
            <ul className="flex flex-col">
              {workflows.map((count) => (
                <WorkflowRow count={count} key={`${count.workflowType}-${count.mediaType}`} maxCount={maxCount} total={total} />
              ))}
            </ul>
          )}
    </DashboardSection>
  );
};
