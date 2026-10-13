import { DashboardEmptyState, DashboardSection } from '@components/dashboard/DashboardSection';
import { formatGenerationCount } from '@components/dashboard/format';
import { ShareBar } from '@components/dashboard/ShareBar';
import { CATEGORY_TILE_CLASSES } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import type { GenerationModelCount } from '@services/api/dashboard';
import { cn } from 'cn';
import type { FC } from 'react';

const MEDIA_TYPE_LABELS: Record<GenerationModelCount['mediaType'], string> = {
  audio: 'Audio',
  image: 'Image'
};

interface ModelRowProps {
  count: GenerationModelCount;
  maxCount: number;
  rank: number;
}

const ModelRow: FC<ModelRowProps> = ({ count, maxCount, rank }) => (
  <li className="flex items-center gap-3 py-2">
    <span className={cn('w-5 shrink-0 text-center text-sm font-semibold tabular-nums', rank > 3 && 'text-muted-foreground')}>{rank}</span>
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm leading-none">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium" title={count.model}>{count.model}</span>
          <Badge className={cn('shrink-0', CATEGORY_TILE_CLASSES[count.mediaType])}>{MEDIA_TYPE_LABELS[count.mediaType]}</Badge>
        </span>
        <span className="shrink-0 font-medium tabular-nums">{formatGenerationCount(count.generationCount)}</span>
      </div>
      <ShareBar max={maxCount} value={count.generationCount} />
    </div>
  </li>
);

export interface TopModelsProps {
  models: GenerationModelCount[];
}

export const TopModels: FC<TopModelsProps> = ({ models }) => {
  const maxCount = models[0]?.generationCount ?? 0;

  return (
    <DashboardSection description="The models behind the most generations." title="Top models">
      {models.length === 0
        ? <DashboardEmptyState>No model has been used yet</DashboardEmptyState>
        : (
            <ol className="flex flex-col">
              {models.map((count, index) => (
                <ModelRow count={count} key={`${count.model}-${count.mediaType}`} maxCount={maxCount} rank={index + 1} />
              ))}
            </ol>
          )}
    </DashboardSection>
  );
};
