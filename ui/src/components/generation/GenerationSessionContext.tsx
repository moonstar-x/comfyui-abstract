import { invalidateGenerationHistory } from '@components/history/hooks/useGenerations';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { playBeep } from '@core/utils/audio';
import { flashDocumentTitle, isPageInBackground } from '@core/utils/title';
import type { Nullable } from '@core/utils/types';
import { getOutputKind, toOutputUrl } from '@core/workflows/outputs';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { Context, FC, ReactNode } from 'react';

export interface Generation {
  createdAt: number;
  durationMs: number;
  files: string[];
  /**
   * The id of the stored generation, null when the API could not store it.
   */
  generationId: Nullable<string>;
  kind: WorkflowOutputKind;
  promptId: string;
  queueWaitMs: Nullable<number>;
}

interface ContextValue {
  clear: () => void;
  generations: Generation[];
  remove: (promptId: string) => void;
}

export interface UseGenerationSessionReturn {
  clear: () => void;
  current: Nullable<Generation>;
  generations: Generation[];
  /**
   * Drops a result from the session, such as once its generation is deleted.
   */
  remove: (promptId: string) => void;
}

interface AwayNotification {
  beepFrequencyHz: number;
  title: string;
}

// A lower tone for failures, so the outcome can be told apart without looking.
const COMPLETE_NOTIFICATION: AwayNotification = { beepFrequencyHz: 880, title: 'Generation Complete!' };
const FAILED_NOTIFICATION: AwayNotification = { beepFrequencyHz: 440, title: 'Generation Failed!' };

/**
 * Lets the user know a run ended when they went to do something else while waiting for it.
 */
const notifyIfAway = ({ beepFrequencyHz, title }: AwayNotification): void => {
  if (!isPageInBackground()) {
    return;
  }

  flashDocumentTitle(title);
  void playBeep(beepFrequencyHz);
};

const GenerationSessionContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

interface Props {
  children: ReactNode;
}

export const GenerationSessionProvider: FC<Props> = ({ children }) => {
  const { messenger } = useAppWebSocket();
  const queryClient = useQueryClient();
  // Newest first. Lives above the router so results survive page navigation, including runs that finish while away.
  const [generations, setGenerations] = useState<Generation[]>([]);

  // The server sends the completions of every run of the user, whichever tab started it, and again after a reconnect if it missed one.
  useEffect(() => messenger.on('workflow_complete', ({ payload }) => {
    const files = payload.files.map((path) => toOutputUrl(path));
    const generation: Generation = {
      createdAt: Date.now(),
      durationMs: payload.durationMs,
      files,
      generationId: payload.generationId,
      // A run only ever produces one kind of file. An empty run has nothing to show, so its kind doesn't matter.
      kind: files[0] === undefined ? 'image' : getOutputKind(files[0]),
      promptId: payload.promptId,
      queueWaitMs: payload.queueWaitMs
    };

    setGenerations((previous) => previous.some((item) => item.promptId === generation.promptId) ? previous : [generation, ...previous]);
    // The API stores the generation before sending the completion, so the history already has it.
    void invalidateGenerationHistory(queryClient);
    notifyIfAway(COMPLETE_NOTIFICATION);
  }), [messenger, queryClient]);

  // Like completions, these arrive for every run of the user. The error itself is shown by useRunWorkflow.
  useEffect(() => messenger.on('workflow_error', () => {
    notifyIfAway(FAILED_NOTIFICATION);
  }), [messenger]);

  const clear = useCallback(() => {
    setGenerations([]);
  }, []);

  const remove = useCallback((promptId: string) => {
    setGenerations((previous) => previous.filter((generation) => generation.promptId !== promptId));
  }, []);

  const context = useMemo<ContextValue>(() => ({ clear, generations, remove }), [clear, generations, remove]);

  return (
    <GenerationSessionContext value={context}>
      {children}
    </GenerationSessionContext>
  );
};

/**
 * Only the generations of the given kind, so images and audio don't show up on each other's pages.
 */
export const useGenerationSession = (kind: WorkflowOutputKind): UseGenerationSessionReturn => {
  const context = use(GenerationSessionContext);
  if (context === null) {
    throw new Error('You must call useGenerationSession inside of a GenerationSessionProvider.');
  }

  const { clear, generations: allGenerations, remove } = context;

  return useMemo(() => {
    const generations = allGenerations.filter((generation) => generation.kind === kind);

    return {
      clear,
      current: generations[0] ?? null,
      generations,
      remove
    };
  }, [allGenerations, clear, kind, remove]);
};
