import { useSetConversationPinned } from '@components/chat/hooks/useConversations';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { ConversationRecord } from '@services/api/conversations';
import { cn } from 'cn';
import { Pin } from 'lucide-react';
import type { ComponentProps, FC } from 'react';

export interface ChatPinButtonProps {
  // Applied while the conversation is not pinned, such as to only show the button on hover.
  className?: string;
  conversation: ConversationRecord;
  size?: ComponentProps<typeof Button>['size'];
}

/**
 * Always shown while the conversation is pinned. Pins the conversation to the top of the chat history, or unpins it.
 */
export const ChatPinButton: FC<ChatPinButtonProps> = ({ className, conversation, size = 'icon-xs' }) => {
  const { isPending, mutate, variables } = useSetConversationPinned();
  // Shows the new state right away instead of waiting for the list to refetch.
  const isPinned = isPending ? variables.isPinned : conversation.pinnedAt !== null;
  const label = `${isPinned ? 'Unpin' : 'Pin'} ${conversation.title}`;

  return (
    <Button
      aria-label={label}
      className={cn(!isPinned && className)}
      disabled={isPending}
      size={size}
      title={isPinned ? 'Unpin' : 'Pin'}
      type="button"
      variant="ghost"
      onClick={() => {
        mutate({ id: conversation.id, isPinned: !isPinned });
      }}
    >
      {/* Filled while pinned, so pinned chats stand out in the list. */}
      <Pin aria-hidden="true" className={cn(isPinned && 'fill-current')} />
    </Button>
  );
};
