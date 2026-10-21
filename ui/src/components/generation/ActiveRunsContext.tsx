import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable } from '@core/utils/types';
import type { ActiveRun } from '@services/websocket/messages/server';
import { createContext, use, useEffect, useMemo, useRef, useState } from 'react';
import type { Context, FC, ReactNode } from 'react';

interface ContextValue {
  /**
   * Oldest first.
   */
  runs: ActiveRun[];
}

const ActiveRunsContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

const removeRun = (runs: ActiveRun[], promptId: string): ActiveRun[] => runs.some((run) => run.promptId === promptId) ? runs.filter((run) => run.promptId !== promptId) : runs;

interface Props {
  children: ReactNode;
}

/**
 * The runs of the user that have not finished yet, whichever tab started them. The server keeps following runs while a tab is
 * disconnected or reloaded, so the list is fetched again every time the connection opens.
 */
export const ActiveRunsProvider: FC<Props> = ({ children }) => {
  const { messenger, isConnected } = useAppWebSocket();
  const [runs, setRuns] = useState<ActiveRun[]>([]);
  // Read when the connection opens, so the runs that finished while it was down are settled by their results.
  const runsRef = useRef<ActiveRun[]>(runs);

  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  useEffect(() => {
    const finish = ({ payload }: { payload: { promptId: string } }): void => {
      setRuns((previous) => removeRun(previous, payload.promptId));
    };

    const unsubscribers = [
      messenger.on('runs', ({ payload }) => {
        setRuns(payload.runs);
      }),
      messenger.on('workflow_queued', ({ payload }) => {
        setRuns((previous) => previous.some((run) => run.promptId === payload.run.promptId) ? previous : [...previous, payload.run]);
      }),
      messenger.on('workflow_progress', ({ payload: { promptId, ...progress } }) => {
        setRuns((previous) => previous.map((run) => run.promptId === promptId ? { ...run, progress } : run));
      }),
      messenger.on('workflow_complete', finish),
      messenger.on('workflow_error', finish),
      messenger.on('workflow_cancelled', finish)
    ];

    return (): void => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [messenger]);

  useEffect(() => {
    if (isConnected) {
      messenger.send({ type: 'get_runs', payload: { promptIds: runsRef.current.map((run) => run.promptId) } });
    }
  }, [isConnected, messenger]);

  const context = useMemo<ContextValue>(() => ({ runs }), [runs]);

  return (
    <ActiveRunsContext value={context}>
      {children}
    </ActiveRunsContext>
  );
};

export const useActiveRuns = (): ActiveRun[] => {
  const context = use(ActiveRunsContext);
  if (context === null) {
    throw new Error('You must call useActiveRuns inside of an ActiveRunsProvider.');
  }

  return context.runs;
};
