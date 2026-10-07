import { ComfyUiStatus } from '@components/comfyui/ComfyUiStatus';
import { ThemeToggle } from '@components/theme/ThemeToggle';
import { Separator } from '@components/ui/third-party/shadcn/separator';
import { SidebarTrigger } from '@components/ui/third-party/shadcn/sidebar';
import type { FC } from 'react';

export const AppHeader: FC = () => (
  <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
    <SidebarTrigger className="-ml-1" />
    <Separator className="mx-1 h-4 self-center!" orientation="vertical" />
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <ComfyUiStatus />
      <ThemeToggle />
    </div>
  </header>
);
