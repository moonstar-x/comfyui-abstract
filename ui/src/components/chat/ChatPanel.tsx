import { useChat } from '@components/chat/ChatContext';
import { ChatConversationPane } from '@components/chat/ChatConversationPane';
import { ChatListPane } from '@components/chat/ChatListPane';
import { cn } from 'cn';
import type { FC } from 'react';

/**
 * The chat history and the open chat side by side, sliding from right to left when a chat opens and back when returning to the history.
 * Only the pane on screen can be focused.
 */
export const ChatPanel: FC = () => {
  const { pane } = useChat();
  const isConversationShown = pane === 'conversation';

  return (
    <div className="relative flex size-full min-h-0 overflow-hidden bg-background">
      <div className={cn('flex h-full w-[200%] shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none', isConversationShown && '-translate-x-1/2')}>
        <section aria-label="Chat history" className="flex h-full w-1/2 min-w-0 flex-col" inert={isConversationShown}>
          <ChatListPane />
        </section>
        <section aria-label="Chat" className="flex h-full w-1/2 min-w-0 flex-col" inert={!isConversationShown}>
          <ChatConversationPane isActive={isConversationShown} />
        </section>
      </div>
    </div>
  );
};
