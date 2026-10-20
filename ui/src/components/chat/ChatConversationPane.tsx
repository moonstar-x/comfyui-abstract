import { isReplyShownIn, useChat } from '@components/chat/ChatContext';
import { AssistantMessage, UserMessage } from '@components/chat/ChatMessage';
import { ChatPaneHeader } from '@components/chat/ChatPaneHeader';
import { ChatPromptInput } from '@components/chat/ChatPromptInput';
import { useConversation } from '@components/chat/hooks/useConversations';
import { Button } from '@components/ui/third-party/shadcn/button';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@components/ui/third-party/shadcn/message-scroller';
import type { Nullable } from '@core/utils/types';
import { useIsMobile } from '@hooks/useMobile';
import { ApiError } from '@services/api/client';
import { ArrowLeft, LoaderCircle, MessagesSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';

const PENDING_USER_MESSAGE_ID = 'pending-user-message';
const PENDING_REPLY_ID = 'pending-reply';

const MAX_PENDING_TITLE_LENGTH = 60;

const CenteredNotice: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export interface ChatConversationPaneProps {
  // Whether the pane is the one on screen, which focuses the message field on desktop.
  isActive: boolean;
}

/**
 * The messages of a conversation, or of a new chat, with the field to send the next one.
 */
export const ChatConversationPane: FC<ChatConversationPaneProps> = ({ isActive }) => {
  const { conversationId, discardReply, isOpen, reply, retry, send, showList, stop, thoughtDurations, viewKey } = useChat();
  const { data, error, isPending } = useConversation(conversationId);
  const isMobile = useIsMobile();
  const textareaRef = useRef<Nullable<HTMLTextAreaElement>>(null);
  // Kept per opened chat, so a half written message doesn't follow the user into another one.
  const [draft, setDraft] = useState({ text: '', viewKey });
  const draftText = draft.viewKey === viewKey ? draft.text : '';
  const updateDraft = (text: string): void => {
    setDraft({ text, viewKey });
  };

  const messages = data?.messages ?? [];
  const isReplyShown = isReplyShownIn(reply, conversationId, messages.map((message) => message.id));
  const isStreaming = reply?.status === 'streaming';

  // Focused whenever a chat opens on desktop. On mobile it would pop up the keyboard over the messages.
  useEffect(() => {
    if (isActive && isOpen && !isMobile) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [isActive, isMobile, isOpen, viewKey]);

  const getTitle = (): string => {
    if (data !== undefined) {
      return data.title;
    }

    // A new chat is titled after its first message, which the API does too.
    if (isReplyShown) {
      const firstLine = reply.userContent.split('\n', 1)[0] ?? '';
      return firstLine.length > MAX_PENDING_TITLE_LENGTH ? `${firstLine.slice(0, MAX_PENDING_TITLE_LENGTH - 1)}…` : firstLine;
    }

    return conversationId === null ? 'New chat' : '';
  };

  const renderMessages = (): ReactNode => {
    if (error !== null && !isReplyShown) {
      const isMissing = error instanceof ApiError && error.status === 404;
      return (
        <CenteredNotice>
          <p>{isMissing ? 'This chat no longer exists.' : error.message}</p>
          <Button size="sm" type="button" variant="outline" onClick={showList}>Back to chats</Button>
        </CenteredNotice>
      );
    }

    if (isPending && !isReplyShown && conversationId !== null) {
      return (
        <CenteredNotice>
          <LoaderCircle aria-label="Loading chat" className="size-5 animate-spin" />
        </CenteredNotice>
      );
    }

    if (!isReplyShown && messages.length === 0) {
      return (
        <CenteredNotice>
          <MessagesSquare aria-hidden="true" className="size-8 text-muted-foreground/60" />
          <p>Send a message to start the chat.</p>
        </CenteredNotice>
      );
    }

    return (
      <MessageScrollerProvider autoScroll defaultScrollPosition="end" key={viewKey}>
        <MessageScroller className="flex-1">
          <MessageScrollerViewport aria-label="Messages">
            <MessageScrollerContent className="px-4 py-4">
              {messages.map((message) => (
                // A new question scrolls to the top so its reply has room to stream in below it.
                <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === 'user'}>
                  {message.role === 'user'
                    ? <UserMessage content={message.content} />
                    : <AssistantMessage content={message.content} reasoning={message.reasoning} reasoningMs={thoughtDurations.get(message.id)} />}
                </MessageScrollerItem>
              ))}
              {isReplyShown && (
                <>
                  <MessageScrollerItem scrollAnchor messageId={PENDING_USER_MESSAGE_ID}>
                    <UserMessage content={reply.userContent} />
                  </MessageScrollerItem>
                  <MessageScrollerItem messageId={PENDING_REPLY_ID}>
                    <AssistantMessage
                      content={reply.content}
                      error={reply.error}
                      isStreaming={isStreaming}
                      reasoning={reply.reasoning}
                      reasoningMs={reply.reasoningMs}
                      onEdit={reply.status === 'failed'
                        ? (): void => {
                            updateDraft(reply.userContent);
                            discardReply();
                            textareaRef.current?.focus();
                          }
                        : undefined}
                      onRetry={reply.status === 'failed' ? retry : undefined}
                    />
                  </MessageScrollerItem>
                </>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
    );
  };

  return (
    <>
      <ChatPaneHeader
        title={getTitle()}
        leading={(
          <Button aria-label="Back to chats" size="icon-sm" type="button" variant="ghost" onClick={showList}>
            <ArrowLeft aria-hidden="true" />
          </Button>
        )}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {renderMessages()}
      </div>
      <ChatPromptInput
        isStreaming={isStreaming}
        textareaRef={textareaRef}
        usage={data?.context ?? null}
        value={draftText}
        onChange={updateDraft}
        onSend={send}
        onStop={stop}
      />
    </>
  );
};
