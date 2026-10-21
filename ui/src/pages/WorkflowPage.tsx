import { useChatPageWorkflowContext } from '@components/chat/ChatContext';
import { CATEGORY_TILE_CLASSES, findNavMatch } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { useRunWorkflow } from '@components/websocket/hooks/useRunWorkflow';
import { useWorkflowDefinition } from '@components/workflow/hooks/useWorkflowDefinition';
import { WorkflowModelPicker } from '@components/workflow/WorkflowModelPicker';
import { WorkflowParamsForm } from '@components/workflow/WorkflowParamsForm';
import { WORKFLOW_MODEL_SEARCH_PARAM } from '@core/router/routes';
import type { Nullable } from '@core/utils/types';
import { findWorkflowModel, isWorkflowType } from '@core/workflows/definitions';
import { getWorkflowPrefill } from '@core/workflows/params';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import NotFoundPage from '@pages/NotFoundPage';
import type { WorkflowType } from '@services/websocket/messages/client';
import type { FC, ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';

const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-90 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
    {children}
  </div>
);

const WorkflowPageContent: FC<{ type: WorkflowType }> = ({ type }) => {
  const location = useLocation();
  const { pathname } = location;
  // Location state can hold anything, so it is only read through getWorkflowPrefill.
  const state: unknown = location.state;
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: definition, error, isPending } = useWorkflowDefinition(type);

  const match = findNavMatch(pathname);
  const title = match?.item.title ?? type;
  useDocumentTitle(title);
  const models = definition?.models ?? [];
  const model = definition === undefined
    ? null
    : findWorkflowModel(definition, searchParams.get(WORKFLOW_MODEL_SEARCH_PARAM)) ?? models[0] ?? null;
  const modelContext = model === null ? null : { type, model: model.alias };
  const runner = useRunWorkflow(modelContext);
  useChatPageWorkflowContext(modelContext);

  const handleModelChange = (next: Nullable<string>): void => {
    runner.reset();
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next === null) {
        params.delete(WORKFLOW_MODEL_SEARCH_PARAM);
      } else {
        params.set(WORKFLOW_MODEL_SEARCH_PARAM, next);
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

    // Only null once loaded when the workflow has no models, since otherwise it falls back to the first one.
    if (model === null) {
      return <Placeholder>There are no models configured for this workflow</Placeholder>;
    }

    // Keyed by model so switching models starts from that model's defaults. Switching also drops the location state, and with it the prefill.
    return <WorkflowParamsForm key={model.alias} model={model} prefill={getWorkflowPrefill(state, model.alias)} runner={runner} type={type} />;
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 page-md:p-6">
      <div className="flex flex-col gap-5 page-sm:flex-row page-sm:items-end page-sm:justify-between">
        <div className="flex flex-col items-start gap-2">
          {match !== null && match.section !== null && (
            <Badge className={CATEGORY_TILE_CLASSES[match.item.category]}>{match.section}</Badge>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>

        <WorkflowModelPicker disabled={runner.isSubmitting || runner.isRunning} models={models} value={model?.alias ?? null} onChange={handleModelChange} />
      </div>

      {renderContent()}
    </div>
  );
};

const WorkflowPage: FC = () => {
  const { id } = useParams();
  if (!isWorkflowType(id)) {
    return <NotFoundPage />;
  }

  // Keyed by type so the selected model and form state don't leak between workflows.
  return <WorkflowPageContent key={id} type={id} />;
};

export default WorkflowPage;
