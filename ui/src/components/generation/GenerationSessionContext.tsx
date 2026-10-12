import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { API_URL } from '@core/config/environment';
import type { Nullable } from '@core/utils/types';
import { getOutputKind } from '@core/workflows/outputs';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { Context, FC, ReactNode } from 'react';

const toOutputUrl = (path: string): string => new URL(path, API_URL).href;

export interface Generation {
  createdAt: number;
  files: string[];
  kind: WorkflowOutputKind;
  promptId: string;
}

interface ContextValue {
  clear: () => void;
  generations: Generation[];
}

export interface UseGenerationSessionReturn {
  clear: () => void;
  current: Nullable<Generation>;
  generations: Generation[];
  previous: Generation[];
}

const GenerationSessionContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

interface Props {
  children: ReactNode;
}

export const GenerationSessionProvider: FC<Props> = ({ children }) => {
  const { messenger } = useAppWebSocket();
  // Newest first. Lives above the router so results survive page navigation, including runs that finish while away.
  const [generations, setGenerations] = useState<Generation[]>([]);

  // The server only sends completions for runs started by this connection, so every one belongs to this session.
  useEffect(() => messenger.on('workflow_complete', ({ payload }) => {
    const files = payload.files.map((path) => toOutputUrl(path));
    const generation: Generation = {
      createdAt: Date.now(),
      files,
      // A run only ever produces one kind of file. An empty run has nothing to show, so its kind doesn't matter.
      kind: files[0] === undefined ? 'image' : getOutputKind(files[0]),
      promptId: payload.promptId
    };

    setGenerations((previous) => previous.some((item) => item.promptId === generation.promptId) ? previous : [generation, ...previous]);
  }), [messenger]);

  const clear = useCallback(() => {
    setGenerations([]);
  }, []);

  const context = useMemo<ContextValue>(() => ({ clear, generations }), [clear, generations]);

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

  const { clear, generations: allGenerations } = context;

  return useMemo(() => {
    const generations = allGenerations.filter((generation) => generation.kind === kind);

    return {
      clear,
      current: generations[0] ?? null,
      generations,
      previous: generations.slice(1)
    };
  }, [allGenerations, clear, kind]);
};
