import { useChat } from '@components/chat/ChatContext';
import { Button } from '@components/ui/third-party/shadcn/button';
import { PanelRightClose } from 'lucide-react';
import type { FC, ReactNode } from 'react';

export interface ChatPaneHeaderProps {
  // Shown after the title, before the close button.
  actions?: ReactNode;
  // Shown before the title, such as the back arrow.
  leading?: ReactNode;
  title: ReactNode;
}

/**
 * The header of a pane of the chat. Matches the height of the app header so both line up on desktop.
 */
export const ChatPaneHeader: FC<ChatPaneHeaderProps> = ({ actions, leading, title }) => {
  const { setOpen } = useChat();

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b px-2">
      {leading}
      <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-medium">{title}</h2>
      {actions}
      <Button
        aria-label="Hide chat"
        className="cursor-pointer"
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => {
          setOpen(false);
        }}
      >
        <PanelRightClose aria-hidden="true" />
      </Button>
    </header>
  );
};
