import { findWorkflowNavItem } from '@components/ui/app/navigation';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { WorkflowContext } from '@services/api/conversations';
import { cn } from 'cn';
import { BookOpenText, MessageSquarePlus, TriangleAlert } from 'lucide-react';
import type { FC } from 'react';

export interface ChatWorkflowContextBannerProps {
  context: WorkflowContext;
  // A new chat that has no messages yet, which takes the context once its first message is sent.
  isPending: boolean;
  // The page no longer shows the workflow and model of the context.
  isStale: boolean;
  // Starts a new chat with the context of the current page, so the history of this one isn't mixed with another workflow or model.
  // Only offered while the context is stale and the page is a workflow page.
  onUseCurrentPage?: (() => void) | undefined;
}

const getDescription = (isPending: boolean, isStale: boolean): string => {
  if (isStale) {
    return 'This chat was started from another workflow or model, so its context is no longer relevant to the current page.';
  }

  return isPending
    ? 'The instructions of this workflow and model are loaded into the chat with your first message.'
    : 'The assistant knows the instructions of this workflow and model.';
};

/**
 * Which workflow and model the chat was told about. Turns amber once the page shows something else.
 */
export const ChatWorkflowContextBanner: FC<ChatWorkflowContextBannerProps> = ({ context, isPending, isStale, onUseCurrentPage }) => {
  const workflowTitle = findWorkflowNavItem(context.type)?.title ?? context.type;
  const Icon = isStale ? TriangleAlert : BookOpenText;

  return (
    <div
      className={cn(
        'mx-3 mt-3 flex shrink-0 gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors',
        isStale ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200' : 'bg-muted/50 text-muted-foreground'
      )}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-3.5 shrink-0', !isStale && 'text-primary')} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={cn('truncate font-medium', !isStale && 'text-foreground')}>
          {workflowTitle}
          {' · '}
          {context.model}
        </p>
        <p>{getDescription(isPending, isStale)}</p>
        {isStale && onUseCurrentPage !== undefined && (
          <Button
            className="mt-1.5 self-start border-amber-500/40 bg-transparent text-current hover:bg-amber-500/15 hover:text-current dark:bg-transparent dark:hover:bg-amber-500/15"
            size="xs"
            title="Starts a new chat with the workflow and model of this page"
            type="button"
            variant="outline"
            onClick={onUseCurrentPage}
          >
            <MessageSquarePlus aria-hidden="true" />
            Use this page instead
          </Button>
        )}
      </div>
    </div>
  );
};
