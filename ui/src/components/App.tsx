import { GenerationSessionProvider } from '@components/generation/GenerationSessionContext';
import { Router } from '@components/router/Router';
import { ThemeProvider } from '@components/theme/ThemeContext';
import { TooltipProvider } from '@components/ui/third-party/shadcn/tooltip';
import { WebSocketProvider } from '@components/websocket/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { FC } from 'react';
import '@styles/main.css';

const queryClient = new QueryClient();

export const App: FC = () => (
  <QueryClientProvider client={queryClient}>
    <ReactQueryDevtools buttonPosition="bottom-right" initialIsOpen={false} />
    <ThemeProvider>
      <TooltipProvider>
        <WebSocketProvider>
          <GenerationSessionProvider>
            <Router />
          </GenerationSessionProvider>
        </WebSocketProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
