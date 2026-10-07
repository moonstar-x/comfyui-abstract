import { CATEGORY_TILE_CLASSES, findNavMatch } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import type { FC } from 'react';
import { useLocation, useParams } from 'react-router';

const WorkflowPage: FC = () => {
  const { pathname } = useLocation();
  const { id } = useParams();
  const match = findNavMatch(pathname);

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col items-start gap-2">
        {match !== null && match.section !== null && (
          <Badge className={CATEGORY_TILE_CLASSES[match.item.category]}>{match.section}</Badge>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{match?.item.title}</h1>
      </div>
      <div className="flex min-h-90 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
        Workflow content for
        {' '}
        {id}
      </div>
    </div>
  );
};

export default WorkflowPage;
