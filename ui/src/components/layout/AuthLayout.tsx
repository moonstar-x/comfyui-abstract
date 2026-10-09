import { ThemeToggle } from '@components/theme/ThemeToggle';
import { Workflow } from 'lucide-react';
import { Suspense } from 'react';
import type { FC } from 'react';
import { Outlet } from 'react-router';

export const AuthLayout: FC = () => (
  <div className="flex min-h-svh flex-col bg-background">
    <header className="flex h-14 shrink-0 items-center justify-end px-4">
      <ThemeToggle />
    </header>
    <main className="flex flex-1 items-start justify-center px-4 pt-[8vh] pb-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Workflow className="size-4" />
          </span>
          <span className="font-semibold">ComfyUI Abstract</span>
        </div>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </main>
  </div>
);
