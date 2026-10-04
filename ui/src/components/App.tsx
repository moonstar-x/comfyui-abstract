import { Router } from '@components/router/Router';
import { WebSocketProvider } from '@components/websocket/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { FC } from 'react';

const queryClient = new QueryClient();

export const App: FC = () => (
  <QueryClientProvider client={queryClient}>
    <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
    <WebSocketProvider>
      <Router />
    </WebSocketProvider>
  </QueryClientProvider>
);
