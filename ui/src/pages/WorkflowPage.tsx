import { CATEGORY_TILE_CLASSES, findNavMatch } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { useWorkflowDefinition } from '@components/workflow/hooks/useWorkflowDefinition';
import { WorkflowModelPicker } from '@components/workflow/WorkflowModelPicker';
import { WorkflowParamsForm } from '@components/workflow/WorkflowParamsForm';
import type { Nullable } from '@core/utils/types';
import { findWorkflowModel, isWorkflowType } from '@core/workflows/definitions';
import type { WorkflowType } from '@services/websocket/messages/client';
import type { FC, ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';

const MODEL_SEARCH_PARAM = 'model';

const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-90 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
    {children}
  </div>
);

const WorkflowPageContent: FC<{ type: WorkflowType }> = ({ type }) => {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: definition, error, isPending } = useWorkflowDefinition(type);

  const match = findNavMatch(pathname);
  const models = definition?.models ?? [];
  const model = definition === undefined ? null : findWorkflowModel(definition, searchParams.get(MODEL_SEARCH_PARAM));

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

  const renderContent = (): ReactNode => {
    if (isPending) {
      return <Placeholder>Loading workflow…</Placeholder>;
    }

    if (error !== null) {
      return <Placeholder>{error.message}</Placeholder>;
    }

    if (models.length === 0) {
      return <Placeholder>There are no models configured for this workflow</Placeholder>;
    }

    if (model === null) {
      return <Placeholder>Select a model to configure the workflow</Placeholder>;
    }

    // Keyed by model so switching models starts from that model's defaults.
    return <WorkflowParamsForm key={model.alias} model={model} type={type} />;
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-start gap-2">
          {match !== null && match.section !== null && (
            <Badge className={CATEGORY_TILE_CLASSES[match.item.category]}>{match.section}</Badge>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{match?.item.title ?? type}</h1>
        </div>

        <WorkflowModelPicker models={models} value={model?.alias ?? null} onChange={handleModelChange} />
      </div>

      {renderContent()}
    </div>
  );
};

const WorkflowPage: FC = () => {
  const { id } = useParams();
  if (!isWorkflowType(id)) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Workflow not found</h1>
        <Placeholder>
          There is no workflow named
          {' '}
          {id}
        </Placeholder>
      </div>
    );
  }

  // Keyed by type so the selected model and form state don't leak between workflows.
  return <WorkflowPageContent key={id} type={id} />;
};

export default WorkflowPage;
