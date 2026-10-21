import { Button } from '@components/ui/third-party/shadcn/button';
import { RouteDefs } from '@core/router/routes';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { ArrowLeft, Compass } from 'lucide-react';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';

const NotFoundPage: FC = () => {
  useDocumentTitle('Page not found');
  const { pathname } = useLocation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center page-md:p-6">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-tile-general text-tile-general-foreground">
        <Compass aria-hidden="true" className="size-7" />
      </span>
      <div className="flex max-w-md flex-col items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you are looking for does not exist. It may have been moved, or the link may be wrong.</p>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">{pathname}</code>
      </div>
      <Button nativeButton={false} render={<Link to={RouteDefs.home} />} variant="outline">
        <ArrowLeft aria-hidden="true" data-icon="inline-start" />
        Back to Dashboard
      </Button>
    </div>
  );
};

export default NotFoundPage;
