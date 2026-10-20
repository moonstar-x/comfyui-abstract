import { ChatProvider } from '@components/chat/ChatContext';
import { ChatSidecar } from '@components/chat/ChatSidecar';
import { GenerationSessionProvider } from '@components/generation/GenerationSessionContext';
import { AppHeader } from '@components/ui/app/AppHeader';
import { AppSidebar } from '@components/ui/app/AppSidebar';
import { SidebarInset, SidebarProvider } from '@components/ui/third-party/shadcn/sidebar';
import { WebSocketProvider } from '@components/websocket/WebSocketContext';
import { Suspense } from 'react';
import type { CSSProperties, FC } from 'react';
import { Outlet } from 'react-router';

const SIDEBAR_STYLE: CSSProperties & Record<'--sidebar-width-icon', string> = { '--sidebar-width-icon': '3.5rem' };

// The WebSocket lives here so it only connects while the user is logged in and closes on logout.
// TODO: Implement a good Suspense fallback.
export const AppLayout: FC = () => (
  <WebSocketProvider>
    <GenerationSessionProvider>
      <ChatProvider>
        <SidebarProvider style={SIDEBAR_STYLE}>
          <AppSidebar />
          {/* Shrinks below its content so the chat sidecar can push the page aside. */}
          <SidebarInset className="min-w-0">
            <AppHeader />
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </SidebarInset>
          <ChatSidecar />
        </SidebarProvider>
      </ChatProvider>
    </GenerationSessionProvider>
  </WebSocketProvider>
);
