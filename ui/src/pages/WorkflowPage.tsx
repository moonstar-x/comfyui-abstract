import { CATEGORY_TILE_CLASSES, findNavMatch } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { WorkflowModelPicker } from '@components/workflow/WorkflowModelPicker';
import { WorkflowParamsForm } from '@components/workflow/WorkflowParamsForm';
import type { Nullable } from '@core/utils/types';
import { findWorkflowModel, isWorkflowType, WORKFLOW_DEFINITIONS } from '@core/workflows/definitions';
import type { FC } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';

const MODEL_SEARCH_PARAM = 'model';

const WorkflowPage: FC = () => {
  const { pathname } = useLocation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  if (!isWorkflowType(id)) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Workflow not found</h1>
        <div className="flex min-h-90 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
          There is no workflow named
          {' '}
          {id}
        </div>
      </div>
    );
  }

  const match = findNavMatch(pathname);
  const definition = WORKFLOW_DEFINITIONS[id];
  const model = findWorkflowModel(definition, searchParams.get(MODEL_SEARCH_PARAM));

  const handleModelChange = (next: Nullable<string>): void => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next === null) {
        params.delete(MODEL_SEARCH_PARAM);
      } else {
        params.set(MODEL_SEARCH_PARAM, next);
      }

      return params;
    }, { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-start gap-2">
          {match !== null && match.section !== null && (
            <Badge className={CATEGORY_TILE_CLASSES[match.item.category]}>{match.section}</Badge>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{match?.item.title ?? id}</h1>
        </div>

        <WorkflowModelPicker models={definition.models} value={model?.id ?? null} onChange={handleModelChange} />
      </div>

      {model === null
        ? (
            <div className="flex min-h-90 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
              Select a model to configure the workflow
            </div>
          )
        // Keyed by model so switching models starts from that model's defaults.
        : <WorkflowParamsForm key={`${id}:${model.id}`} model={model} type={id} />}
    </div>
  );
};

export default WorkflowPage;
