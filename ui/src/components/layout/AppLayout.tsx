import { AppHeader } from '@components/ui/app/AppHeader';
import { AppSidebar } from '@components/ui/app/AppSidebar';
import { SidebarInset, SidebarProvider } from '@components/ui/third-party/shadcn/sidebar';
import { Suspense } from 'react';
import type { CSSProperties, FC } from 'react';
import { Outlet } from 'react-router';

const SIDEBAR_STYLE: CSSProperties & Record<'--sidebar-width-icon', string> = { '--sidebar-width-icon': '3.5rem' };

// TODO: Implement a good Suspense fallback.
export const AppLayout: FC = () => (
  <SidebarProvider style={SIDEBAR_STYLE}>
    <AppSidebar />
    <SidebarInset>
      <AppHeader />
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </SidebarInset>
  </SidebarProvider>
);
