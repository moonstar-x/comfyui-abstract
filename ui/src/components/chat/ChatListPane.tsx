import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useChat } from '@components/chat/ChatContext';
import { ChatPaneHeader } from '@components/chat/ChatPaneHeader';
import { ChatPinButton } from '@components/chat/ChatPinButton';
import { useConversations, useDeleteConversation } from '@components/chat/hooks/useConversations';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import type { ConversationRecord } from '@services/api/conversations';
import { cn } from 'cn';
import { LoaderCircle, MessagesSquare, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FC, ReactNode } from 'react';

const RELATIVE_TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60]
];

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

const formatRelativeTime = (date: string): string => {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, unitSeconds] of RELATIVE_TIME_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTimeFormat.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return 'just now';
};

const DeleteConversationButton: FC<{ conversation: ConversationRecord; disabled: boolean }> = ({ conversation, disabled }) => {
  const { error, isPending, mutate, reset } = useDeleteConversation();
  const [open, setOpen] = useState(false);

  // Stays open while deleting so the result is shown, and starts without the error of an earlier attempt.
  const handleOpenChange = (isOpen: boolean): void => {
    if (isPending) {
      return;
    }

    if (isOpen) {
      reset();
    }
    setOpen(isOpen);
  };

  const handleConfirm = (): void => {
    mutate(conversation.id, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger
        disabled={disabled}
        render={(
          <Button
            aria-label={`Delete ${conversation.title}`}
            className="opacity-0 group-hover/chat-item:opacity-100 hover:text-destructive focus-visible:opacity-100 disabled:hidden pointer-coarse:opacity-100"
            size="icon-xs"
            variant="ghost"
          />
        )}
      >
        <Trash2 aria-hidden="true" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-1/2 flex-col gap-4 rounded-xl border bg-background p-4 shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="text-base font-medium">Delete this chat?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              &ldquo;
              {conversation.title}
              &rdquo;
              {' '}
              and all of its messages will be removed permanently.
            </AlertDialog.Description>
          </div>
          {error !== null && <p className="text-sm text-destructive" role="alert">{error.message}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Close disabled={isPending} render={<Button variant="outline" />}>Cancel</AlertDialog.Close>
            <Button disabled={isPending} type="button" variant="destructive" onClick={handleConfirm}>
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

/**
 * The chat history, pinned first, then most recently active first, with a button to start a new chat.
 */
export const ChatListPane: FC = () => {
  const { conversationId, openConversation, reply, startNewChat } = useChat();
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useConversations();
  const conversations = data?.pages.flatMap((page) => page.conversations) ?? [];
  const streamingConversationId = reply?.status === 'streaming' ? reply.conversationId : null;

  const renderList = (): ReactNode => {
    if (isPending) {
      return (
        <div className="flex flex-col gap-2 p-2">
          {Array.from({ length: 6 }, (_, index) => <Skeleton className="h-12 rounded-lg" key={index} />)}
        </div>
      );
    }

    if (error !== null) {
      return <p className="p-4 text-sm text-destructive" role="alert">{error.message}</p>;
    }

    if (conversations.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <MessagesSquare aria-hidden="true" className="size-8 text-muted-foreground/60" />
          <p>You have no chats yet.</p>
          <Button size="sm" type="button" variant="outline" onClick={startNewChat}>
            <SquarePen aria-hidden="true" data-icon="inline-start" />
            Start a chat
          </Button>
        </div>
      );
    }

    return (
      <ul className="flex flex-col gap-0.5 p-2">
        {conversations.map((conversation) => {
          const isStreamingHere = conversation.id === streamingConversationId;

          return (
            <li
              className={cn('group/chat-item flex items-center gap-1 rounded-lg pr-1.5 transition-colors hover:bg-muted', conversation.id === conversationId && 'bg-muted/60')}
              key={conversation.id}
            >
              <button
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                type="button"
                onClick={() => {
                  openConversation(conversation.id);
                }}
              >
                <span className="w-full truncate text-sm">{conversation.title}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isStreamingHere && <LoaderCircle aria-label="Replying" className="size-3 animate-spin" />}
                  {isStreamingHere ? 'Replying…' : formatRelativeTime(conversation.updatedAt)}
                </span>
              </button>
              <ChatPinButton
                className="opacity-0 group-hover/chat-item:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                conversation={conversation}
              />
              <DeleteConversationButton conversation={conversation} disabled={isStreamingHere} />
            </li>
          );
        })}
        {hasNextPage && (
          <li className="flex justify-center p-2">
            <Button disabled={isFetchingNextPage} size="sm" type="button" variant="ghost" onClick={() => { void fetchNextPage(); }}>
              {isFetchingNextPage ? 'Loading…' : 'Load older chats'}
            </Button>
          </li>
        )}
      </ul>
    );
  };

  return (
    <>
      <ChatPaneHeader
        title="Chats"
        actions={(
          <Button aria-label="New chat" size="icon-sm" type="button" variant="ghost" onClick={startNewChat}>
            <SquarePen aria-hidden="true" />
          </Button>
        )}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {renderList()}
      </div>
    </>
  );
};
