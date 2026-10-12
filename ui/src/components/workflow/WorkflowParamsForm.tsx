import { useGenerationSession } from '@components/generation/GenerationSessionContext';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { UseRunWorkflowReturn } from '@components/websocket/hooks/useRunWorkflow';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { WorkflowFieldInput } from '@components/workflow/WorkflowFieldInput';
import { WorkflowImageViewer } from '@components/workflow/WorkflowImageViewer';
import type { ImageGallery } from '@components/workflow/WorkflowImageViewer';
import { WorkflowRunHistory } from '@components/workflow/WorkflowRunHistory';
import { WorkflowRunResult } from '@components/workflow/WorkflowRunResult';
import { WorkflowRunStatus } from '@components/workflow/WorkflowRunStatus';
import type { Nullable } from '@core/utils/types';
import type { WorkflowField, WorkflowModelDefinition } from '@core/workflows/definitions';
import { getWorkflowOutputKind } from '@core/workflows/outputs';
import { makeInitialFormValues, parseWorkflowParams } from '@core/workflows/params';
import type { WorkflowFormErrors, WorkflowFormValue, WorkflowFormValues } from '@core/workflows/params';
import type { RunWorkflowPayload, WorkflowType } from '@services/websocket/messages/client';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { FC, KeyboardEvent, ReactNode, SubmitEvent } from 'react';

// Multiline and list fields span the whole row, see WorkflowFieldInput.
const FIELDS_LAYOUT_CLASSES = 'grid gap-4 @sm:grid-cols-2 @3xl:grid-cols-4';

// Matches the modifier handleKeyDown accepts on each platform.
const SUBMIT_SHORTCUT_LABEL = /Mac|iPad|iPhone/u.test(navigator.userAgent) ? '⌘ ↵' : 'Ctrl ↵';

interface ResultPlaceholderContentProps {
  isSubmitting: boolean;
  promptId: Nullable<string>;
}

const ResultPlaceholderContent: FC<ResultPlaceholderContentProps> = ({ isSubmitting, promptId }) => {
  if (promptId !== null) {
    return <WorkflowRunStatus promptId={promptId} />;
  }

  return isSubmitting ? 'Queueing…' : 'Run the workflow to see the result here';
};

export interface WorkflowParamsFormProps {
  model: WorkflowModelDefinition;
  runner: UseRunWorkflowReturn;
  type: WorkflowType;
}

export const WorkflowParamsForm: FC<WorkflowParamsFormProps> = ({ type, model, runner }) => {
  const { isConnected } = useAppWebSocket();
  const { run, reset, isSubmitting, isRunning, promptId, error } = runner;
  const outputKind = getWorkflowOutputKind(type);
  const { current, previous: history, generations } = useGenerationSession(outputKind);
  const [values, setValues] = useState<WorkflowFormValues>(() => makeInitialFormValues(model.fields));
  const [errors, setErrors] = useState<WorkflowFormErrors>({});
  const [gallery, setGallery] = useState<Nullable<ImageGallery>>(null);
  // The form stays locked from submission until the run settles, not just until it is queued.
  const isBusy = isSubmitting || isRunning;

  const handleChange = (key: string, value: WorkflowFormValue): void => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const handleOpenImages = (images: readonly string[], index: number): void => {
    setGallery({ images, index });
  };

  // The latest result and the previous generations browse together as one gallery, newest first.
  const handleOpenSessionImage = (url: string): void => {
    const images = generations.flatMap((generation) => generation.files);
    setGallery({ images, index: Math.max(images.indexOf(url), 0) });
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

  // Cmd/Ctrl + Enter submits from any field, including multiline ones where Enter inserts a newline.
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    // requestSubmit ignores the submit button's disabled state, so mirror it here.
    if (isConnected && !isBusy) {
      event.currentTarget.requestSubmit();
    }
  };

  const renderFields = (fields: WorkflowField[]): ReactNode => (
    <div className={FIELDS_LAYOUT_CLASSES}>
      {fields.map((field) => (
        <WorkflowFieldInput
          disabled={isBusy}
          error={errors[field.key]}
          field={field}
          key={field.key}
          value={values[field.key] ?? ''}
          onChange={handleChange}
          onOpenImages={handleOpenImages}
        />
      ))}
    </div>
  );

  const visibleFields = model.fields.filter((field) => !field.isAdvanced);
  const advancedFields = model.fields.filter((field) => field.isAdvanced);

  return (
    <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
      {/* The key handler only catches shortcuts bubbling up from the fields, the form itself is not interactive. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form noValidate className="@container flex min-w-0 flex-col gap-6" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
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
          <Button disabled={!isConnected || isBusy} size="lg" type="submit">
            <Play data-icon="inline-start" />
            {isSubmitting ? 'Queueing…' : (isRunning ? 'Generating…' : 'Run Workflow')}
            {!isBusy && (
              <kbd className="ml-1 hidden rounded bg-primary-foreground/15 px-1.5 py-0.5 font-sans text-xs pointer-fine:inline-block">
                {SUBMIT_SHORTCUT_LABEL}
              </kbd>
            )}
          </Button>
          <Button disabled={isBusy} size="lg" type="button" variant="ghost" onClick={handleReset}>
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
        {isBusy || current === null
          ? (
              <div className="flex min-h-90 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 p-4 text-center text-sm text-muted-foreground">
                <ResultPlaceholderContent isSubmitting={isSubmitting} promptId={isRunning ? promptId : null} />
              </div>
            )
          // Only the run started from this page animates in, results already there when it opens appear as they are.
          : <WorkflowRunResult animate={current.promptId === promptId} files={current.files} kind={outputKind} onOpen={handleOpenSessionImage} />}
        {/* While a run is in progress the status takes the result's place, so the latest result joins the history. */}
        <WorkflowRunHistory generations={isBusy ? generations : history} kind={outputKind} onOpen={handleOpenSessionImage} />
      </section>

      <WorkflowImageViewer gallery={gallery} onClose={() => { setGallery(null); }} />
    </div>
  );
};
