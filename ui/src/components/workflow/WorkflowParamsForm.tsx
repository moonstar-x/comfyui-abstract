import { Button } from '@components/ui/third-party/shadcn/button';
import { useRunWorkflow } from '@components/websocket/hooks/useRunWorkflow';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { WorkflowFieldInput } from '@components/workflow/WorkflowFieldInput';
import { WorkflowRunResult } from '@components/workflow/WorkflowRunResult';
import { WorkflowRunStatus } from '@components/workflow/WorkflowRunStatus';
import type { WorkflowField, WorkflowFieldGroup, WorkflowModelDefinition } from '@core/workflows/definitions';
import { makeInitialFormValues, parseWorkflowParams } from '@core/workflows/params';
import type { WorkflowFormErrors, WorkflowFormValues } from '@core/workflows/params';
import type { RunWorkflowPayload, WorkflowType } from '@services/websocket/messages/client';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { FC, ReactNode, SubmitEvent } from 'react';

const GROUP_LAYOUT_CLASSES: Record<WorkflowFieldGroup, string> = {
  prompt: 'grid gap-4',
  settings: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
  advanced: 'grid gap-4 lg:grid-cols-3'
};

export interface WorkflowParamsFormProps {
  model: WorkflowModelDefinition;
  type: WorkflowType;
}

export const WorkflowParamsForm: FC<WorkflowParamsFormProps> = ({ type, model }) => {
  const { isConnected } = useAppWebSocket();
  const { run, reset, isSubmitting, isRunning, promptId, images, error } = useRunWorkflow();
  const [values, setValues] = useState<WorkflowFormValues>(() => makeInitialFormValues(model.fields));
  const [errors, setErrors] = useState<WorkflowFormErrors>({});

  const handleChange = (key: string, value: string): void => {
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

    const payload: RunWorkflowPayload = { type, model: model.id, params: parsed.params };
    run(payload);
  };

  const renderGroup = (group: WorkflowFieldGroup, fields: WorkflowField[]): ReactNode => (
    <div className={GROUP_LAYOUT_CLASSES[group]}>
      {fields.map((field) => (
        <WorkflowFieldInput
          disabled={isSubmitting}
          error={errors[field.key]}
          field={field}
          key={field.key}
          value={values[field.key] ?? ''}
          onChange={handleChange}
        />
      ))}
    </div>
  );

  const fieldsByGroup = (group: WorkflowFieldGroup): WorkflowField[] => model.fields.filter((field) => field.group === group);
  const advancedFields = fieldsByGroup('advanced');

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">{model.description}</p>

      {renderGroup('prompt', fieldsByGroup('prompt'))}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Settings</h2>
        {renderGroup('settings', fieldsByGroup('settings'))}
      </section>

      {advancedFields.length > 0 && (
        <details className="group rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold select-none">Advanced</summary>
          <div className="pt-3 pb-1">
            {renderGroup('advanced', advancedFields)}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-3">
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

        {error !== null && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>
        )}
        {isRunning && promptId !== null && <WorkflowRunStatus promptId={promptId} />}
        {images !== null && <WorkflowRunResult images={images} />}
      </div>
    </form>
  );
};
