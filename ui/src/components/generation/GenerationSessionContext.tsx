import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import { API_URL } from '@core/config/environment';
import type { Nullable } from '@core/utils/types';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { Context, FC, ReactNode } from 'react';

const toOutputUrl = (path: string): string => new URL(path, API_URL).href;

export interface Generation {
  createdAt: number;
  images: string[];
  promptId: string;
}

interface ContextValue {
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
    const generation: Generation = {
      createdAt: Date.now(),
      images: payload.images.map((path) => toOutputUrl(path)),
      promptId: payload.promptId
    };

    setGenerations((previous) => previous.some((item) => item.promptId === generation.promptId) ? previous : [generation, ...previous]);
  }), [messenger]);

  const clear = useCallback(() => {
    setGenerations([]);
  }, []);

  const context = useMemo<ContextValue>(() => ({
    clear,
    current: generations[0] ?? null,
    generations,
    previous: generations.slice(1)
  }), [clear, generations]);

  return (
    <GenerationSessionContext value={context}>
      {children}
    </GenerationSessionContext>
  );
};

export const useGenerationSession = (): ContextValue => {
  const context = use(GenerationSessionContext);
  if (context === null) {
    throw new Error('You must call useGenerationSession inside of a GenerationSessionProvider.');
  }

  return context;
};
