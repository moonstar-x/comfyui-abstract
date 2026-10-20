import { addConversationTurn, invalidateConversation, invalidateConversationList } from '@components/chat/hooks/useConversations';
import type { Nullable } from '@core/utils/types';
import { streamMessage } from '@services/api/conversations';
import type { DoneStreamEvent, MessageStreamEvent } from '@services/api/conversations';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useMemo, useRef, useState } from 'react';
import type { Context, Dispatch, FC, ReactNode, SetStateAction } from 'react';

export type ChatPane = 'conversation' | 'list';

/**
 * A reply that is still streaming, or that failed and can be retried. Finished replies live in the conversation query instead.
 */
export interface ChatReply {
  content: string;
  // The conversation the reply belongs to. Starts as the target and is filled in for a new chat once the API creates it.
  conversationId: Nullable<string>;
  error: Nullable<string>;
  reasoning: string;
  // How long the model reasoned before it started replying, once it did.
  reasoningMs: Nullable<number>;
  // The messages the API saved for this reply. The conversation query notifies a moment later, so the reply hides once it has them.
  savedMessageIds: string[];
  // A stopped reply is shown until the conversation is refetched with the part the API saved.
  status: 'failed' | 'saved' | 'stopped' | 'streaming';
  // The conversation the message was sent to, or null for a new chat.
  targetConversationId: Nullable<string>;
  userContent: string;
}

interface ChatView {
  // The conversation the conversation pane shows, or null for a new chat. Kept while the list is shown so the pane can slide back out.
  conversationId: Nullable<string>;
  // Changes whenever another conversation or a new chat is opened, but not when a new chat gets its ID, so its scroll position survives.
  key: number;
  pane: ChatPane;
}

interface ContextValue {
  conversationId: Nullable<string>;
  // Drops a failed reply, such as when its message goes back to the field to be edited.
  discardReply: () => void;
  isOpen: boolean;
  openConversation: (id: string) => void;
  pane: ChatPane;
  reply: Nullable<ChatReply>;
  retry: () => void;
  send: (content: string) => void;
  setOpen: (isOpen: boolean) => void;
  showList: () => void;
  startNewChat: () => void;
  stop: () => void;
  // How long the model reasoned before each reply streamed in this session, keyed by message ID. Saved messages don't keep it.
  thoughtDurations: ReadonlyMap<string, number>;
  toggle: () => void;
  updateWidth: (width: number) => void;
  viewKey: number;
  // Width of the sidecar on desktop, in pixels.
  width: number;
}

const ChatContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

const WIDTH_STORAGE_KEY = 'comfyui-abstract-chat-width';
const DEFAULT_WIDTH = 400;

// The API saves a stopped reply once it notices the client left, which takes a moment, so it is refetched after this.
const STOPPED_REPLY_SAVE_DELAY_MS = 500;

const readStoredWidth = (): number => {
  try {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
};

const storeWidth = (width: number): void => {
  try {
    localStorage.setItem(WIDTH_STORAGE_KEY, width.toString());
  } catch {
    // Storage can be unavailable (private mode); the width still applies for this tab.
  }
};

const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

interface ReplyRunHandlers {
  queryClient: QueryClient;
  setThoughtDurations: Dispatch<SetStateAction<ReadonlyMap<string, number>>>;
  setView: Dispatch<SetStateAction<ChatView>>;
  // Only updates the reply while it is still the current one, since a newer reply may have replaced it.
  updateReply: (update: (current: ChatReply) => ChatReply) => void;
}

interface ReplyRun {
  /**
   * The API removes a new chat whose first reply failed, so the reply goes back to the new chat to be retried there.
   */
  fail: (error: unknown) => void;
  handle: (event: MessageStreamEvent) => void;
  isDone: () => boolean;
  /**
   * The API keeps a stopped reply as far as it got, so the conversation is refetched to show the saved part in place of the stopped one.
   */
  stop: (clearReply: () => void) => Promise<void>;
}

/**
 * A single reply as it streams, which tracks what it learns along the way, such as the ID of a new chat.
 */
const createReplyRun = (targetConversationId: Nullable<string>, handlers: ReplyRunHandlers): ReplyRun => {
  const { queryClient, setThoughtDurations, setView, updateReply } = handlers;
  let conversationId = targetConversationId;
  let isDone = false;
  let reasoningMs: Nullable<number> = null;
  let reasoningStartedAt: Nullable<number> = null;

  const handleConversation = (id: string): void => {
    conversationId = id;
    updateReply((current) => ({ ...current, conversationId: id }));
    // A new chat becomes the conversation the API just created, unless the user already moved on to another one.
    setView((current) => current.conversationId === null ? { ...current, conversationId: id } : current);
    void invalidateConversationList(queryClient);
  };

  const handleDelta = (content: string): void => {
    if (reasoningStartedAt !== null && reasoningMs === null) {
      reasoningMs = Date.now() - reasoningStartedAt;
    }

    const ms = reasoningMs;
    updateReply((current) => ({ ...current, content: current.content + content, reasoningMs: ms }));
  };

  const handleDone = (event: DoneStreamEvent): void => {
    isDone = true;
    addConversationTurn(queryClient, event);

    const assistantMessage = event.messages.find((message) => message.role === 'assistant');
    const startedAt = reasoningStartedAt;
    if (assistantMessage !== undefined && startedAt !== null) {
      const ms = reasoningMs ?? Date.now() - startedAt;
      setThoughtDurations((current) => new Map(current).set(assistantMessage.id, ms));
    }

    const savedMessageIds = event.messages.map((message) => message.id);
    updateReply((current) => ({ ...current, savedMessageIds, status: 'saved' }));
    void invalidateConversationList(queryClient);
  };

  return {
    fail: (error): void => {
      const removedId = conversationId;
      if (removedId !== null && targetConversationId === null) {
        setView((current) => current.conversationId === removedId ? { ...current, conversationId: null } : current);
        void invalidateConversationList(queryClient);
      }

      const message = error instanceof Error ? error.message : 'The reply failed.';
      updateReply((current) => ({ ...current, conversationId: targetConversationId, error: message, status: 'failed' }));
    },
    handle: (event): void => {
      switch (event.type) {
        case 'conversation':
          handleConversation(event.conversation.id);
          return;

        case 'delta':
          handleDelta(event.content);
          return;

        case 'done':
          handleDone(event);
          return;

        case 'reasoning':
          reasoningStartedAt ??= Date.now();
          updateReply((current) => ({ ...current, reasoning: current.reasoning + event.content }));
      }
    },
    isDone: () => isDone,
    stop: async (clearReply): Promise<void> => {
      updateReply((current) => ({ ...current, status: 'stopped' }));
      await wait(STOPPED_REPLY_SAVE_DELAY_MS);
      if (conversationId !== null) {
        await invalidateConversation(queryClient, conversationId);
      }

      void invalidateConversationList(queryClient);
      // Only dropped once the saved reply is back, so it doesn't flicker away.
      clearReply();
    }
  };
};

interface Props {
  children: ReactNode;
}

/**
 * The state of the chat with the LM Studio model. Lives in the app layout so a reply keeps streaming while the user moves between pages.
 */
export const ChatProvider: FC<Props> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ChatView>({ conversationId: null, key: 0, pane: 'list' });
  const [reply, setReply] = useState<Nullable<ChatReply>>(null);
  const [thoughtDurations, setThoughtDurations] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [width, setWidth] = useState(readStoredWidth);
  const abortRef = useRef<Nullable<AbortController>>(null);

  // Stops the reply when the user logs out, which unmounts the layout.
  useEffect(() => (): void => {
    abortRef.current?.abort();
  }, []);

  const runReply = async (content: string, targetConversationId: Nullable<string>): Promise<void> => {
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrent = (): boolean => abortRef.current === controller;
    const run = createReplyRun(targetConversationId, {
      queryClient,
      setThoughtDurations,
      setView,
      updateReply: (update): void => {
        if (isCurrent()) {
          setReply((current) => current === null ? null : update(current));
        }
      }
    });

    setReply({
      content: '',
      conversationId: targetConversationId,
      error: null,
      reasoning: '',
      reasoningMs: null,
      savedMessageIds: [],
      status: 'streaming',
      targetConversationId,
      userContent: content
    });

    try {
      const events = streamMessage({ content, conversationId: targetConversationId ?? undefined }, controller.signal);
      for await (const event of events) {
        run.handle(event);
      }

      if (!run.isDone()) {
        throw new Error('The reply was interrupted.');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        await run.stop(() => {
          if (isCurrent()) {
            setReply(null);
          }
        });
      } else {
        run.fail(error);
      }
    } finally {
      if (isCurrent()) {
        abortRef.current = null;
      }
    }
  };

  const value = useMemo<ContextValue>(() => ({
    conversationId: view.conversationId,
    discardReply: (): void => {
      setReply((current) => current?.status === 'failed' ? null : current);
    },
    isOpen,
    openConversation: (id): void => {
      setView((current) => ({ conversationId: id, key: current.key + 1, pane: 'conversation' }));
    },
    pane: view.pane,
    reply,
    retry: (): void => {
      if (reply?.status === 'failed') {
        void runReply(reply.userContent, reply.targetConversationId);
      }
    },
    send: (content): void => {
      if (reply?.status !== 'streaming') {
        void runReply(content, view.conversationId);
      }
    },
    setOpen: setIsOpen,
    showList: (): void => {
      setView((current) => ({ ...current, pane: 'list' }));
    },
    startNewChat: (): void => {
      setView((current) => ({ conversationId: null, key: current.key + 1, pane: 'conversation' }));
    },
    stop: (): void => {
      abortRef.current?.abort();
    },
    thoughtDurations,
    toggle: (): void => {
      setIsOpen((current) => !current);
    },
    updateWidth: (next): void => {
      setWidth(next);
      storeWidth(next);
    },
    viewKey: view.key,
    width
  // runReply only reads refs, setters and the query client, which never change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isOpen, reply, thoughtDurations, view, width]);

  return <ChatContext value={value}>{children}</ChatContext>;
};

export const useChat = (): ContextValue => {
  const context = use(ChatContext);
  if (context === null) {
    throw new Error('You must call useChat inside of a ChatProvider.');
  }

  return context;
};

/**
 * Whether the reply should show in the conversation, where null is a new chat. A saved reply is no longer shown once the conversation has its messages.
 */
export const isReplyShownIn = (reply: Nullable<ChatReply>, conversationId: Nullable<string>, messageIds: readonly string[]): reply is ChatReply => {
  if (reply?.conversationId !== conversationId) {
    return false;
  }

  return reply.status !== 'saved' || reply.savedMessageIds.some((id) => !messageIds.includes(id));
};
