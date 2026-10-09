import { useGenerationSession } from '@components/generation/GenerationSessionContext';
import { Button } from '@components/ui/third-party/shadcn/button';
import { useRunWorkflow } from '@components/websocket/hooks/useRunWorkflow';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { WorkflowFieldInput } from '@components/workflow/WorkflowFieldInput';
import { WorkflowImageViewer } from '@components/workflow/WorkflowImageViewer';
import { WorkflowRunHistory } from '@components/workflow/WorkflowRunHistory';
import { WorkflowRunResult } from '@components/workflow/WorkflowRunResult';
import { WorkflowRunStatus } from '@components/workflow/WorkflowRunStatus';
import type { Nullable } from '@core/utils/types';
import type { WorkflowField, WorkflowModelDefinition } from '@core/workflows/definitions';
import { makeInitialFormValues, parseWorkflowParams } from '@core/workflows/params';
import type { WorkflowFormErrors, WorkflowFormValue, WorkflowFormValues } from '@core/workflows/params';
import type { RunWorkflowPayload, WorkflowType } from '@services/websocket/messages/client';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { FC, ReactNode, SubmitEvent } from 'react';

// Multiline and list fields span the whole row, see WorkflowFieldInput.
const FIELDS_LAYOUT_CLASSES = 'grid gap-4 @sm:grid-cols-2 @3xl:grid-cols-4';

export interface WorkflowParamsFormProps {
  model: WorkflowModelDefinition;
  type: WorkflowType;
}

export const WorkflowParamsForm: FC<WorkflowParamsFormProps> = ({ type, model }) => {
  const { isConnected } = useAppWebSocket();
  const { run, reset, isSubmitting, isRunning, promptId, error } = useRunWorkflow();
  const { current, previous: history } = useGenerationSession();
  const [values, setValues] = useState<WorkflowFormValues>(() => makeInitialFormValues(model.fields));
  const [errors, setErrors] = useState<WorkflowFormErrors>({});
  const [viewingUrl, setViewingUrl] = useState<Nullable<string>>(null);

  const handleChange = (key: string, value: WorkflowFormValue): void => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const handleReset = (): void => {
    setValues(makeInitialFormValues(model.fields));
    setErrors({});
    reset();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const parsed = parseWorkflowParams(model.fields, values);
    setErrors(parsed.errors);
    if (Object.keys(parsed.errors).length > 0) {
      return;
    }

    const payload: RunWorkflowPayload = { type, model: model.alias, params: parsed.params };
    run(payload);
  };

  const renderFields = (fields: WorkflowField[]): ReactNode => (
    <div className={FIELDS_LAYOUT_CLASSES}>
      {fields.map((field) => (
        <WorkflowFieldInput
          disabled={isSubmitting}
          error={errors[field.key]}
          field={field}
          key={field.key}
          value={values[field.key] ?? ''}
          onChange={handleChange}
          onOpenImage={setViewingUrl}
        />
      ))}
    </div>
  );

  const visibleFields = model.fields.filter((field) => !field.isAdvanced);
  const advancedFields = model.fields.filter((field) => field.isAdvanced);

  return (
    <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
      <form noValidate className="@container flex min-w-0 flex-col gap-6" onSubmit={handleSubmit}>
        {visibleFields.length > 0 && renderFields(visibleFields)}

        {advancedFields.length > 0 && (
          <details className="group rounded-lg border px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold select-none">Advanced</summary>
            <div className="pt-3 pb-1">
              {renderFields(advancedFields)}
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!isConnected || isSubmitting} size="lg" type="submit">
            <Play data-icon="inline-start" />
            {isSubmitting ? 'Queueing…' : 'Run Workflow'}
          </Button>
          <Button disabled={isSubmitting} size="lg" type="button" variant="ghost" onClick={handleReset}>
            <RotateCcw data-icon="inline-start" />
            Reset
          </Button>
          {!isConnected && <span className="text-sm text-muted-foreground">Waiting for the server connection…</span>}
        </div>
      </form>

      <section aria-label="Result" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        {error !== null && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>
        )}
        {isRunning && promptId !== null && <WorkflowRunStatus promptId={promptId} />}
        {current === null
          ? (
              <div className="flex min-h-90 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
                {isRunning ? 'Generating…' : 'Run the workflow to see the result here'}
              </div>
            )
          : <WorkflowRunResult images={current.images} onOpen={setViewingUrl} />}
        <WorkflowRunHistory generations={history} onOpen={setViewingUrl} />
      </section>

      <WorkflowImageViewer url={viewingUrl} onClose={() => { setViewingUrl(null); }} />
    </div>
  );
};
