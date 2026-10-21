import { useChat } from '@components/chat/ChatContext';
import { Button } from '@components/ui/third-party/shadcn/button';
import { MessagesSquare } from 'lucide-react';
import type { FC } from 'react';

/**
 * Shows the chat, which has its own button to hide it again. A dot tells that a reply is still streaming while the chat is hidden.
 */
export const ChatToggleButton: FC = () => {
  const { reply, setOpen } = useChat();
  const isReplying = reply?.status === 'streaming';

  return (
    <Button
      aria-label={isReplying ? 'Show chat, a reply is streaming' : 'Show chat'}
      className="relative shrink-0"
      size="icon-sm"
      type="button"
      variant="ghost"
      onClick={() => {
        setOpen(true);
      }}
    >
      <MessagesSquare aria-hidden="true" />
      {isReplying && <span aria-hidden="true" className="absolute top-1 right-1 size-2 animate-pulse rounded-full bg-primary" />}
    </Button>
  );
};
