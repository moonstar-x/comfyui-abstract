import { ComfyUiStatus } from '@components/comfyui/ComfyUiStatus';
import { ThemeToggle } from '@components/theme/ThemeToggle';
import { findNavMatch } from '@components/ui/app/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@components/ui/third-party/shadcn/breadcrumb';
import { Separator } from '@components/ui/third-party/shadcn/separator';
import { SidebarTrigger } from '@components/ui/third-party/shadcn/sidebar';
import type { FC } from 'react';
import { useLocation } from 'react-router';

export const AppHeader: FC = () => {
  const { pathname } = useLocation();
  const match = findNavMatch(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator className="mx-1 h-4 self-center!" orientation="vertical" />

      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {match !== null && match.section !== null && (
            <>
              <BreadcrumbItem className="hidden md:inline-flex">{match.section}</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:inline-flex" />
            </>
          )}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate font-medium">{match?.item.title ?? 'Home'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ComfyUiStatus />
        <ThemeToggle />
      </div>
    </header>
  );
};
