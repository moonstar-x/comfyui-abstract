import type { Nullable } from '@core/utils/types';
import { deleteConversation, fetchConversation, fetchConversations } from '@services/api/conversations';
import type { ContextUsage, ConversationDetail, ConversationRecord, ConversationsPage, MessageRecord } from '@services/api/conversations';
import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryClient, UseInfiniteQueryResult, UseMutationResult, UseQueryResult } from '@tanstack/react-query';

const PAGE_SIZE = 30;

// Every conversation query starts with this, so a change can refresh all of them at once.
const CONVERSATIONS_QUERY_KEY = 'conversations';

const getConversationQueryKey = (id: string): string[] => [CONVERSATIONS_QUERY_KEY, 'detail', id];

export const useConversations = (): UseInfiniteQueryResult<InfiniteData<ConversationsPage, number>> => useInfiniteQuery(infiniteQueryOptions({
  queryKey: [CONVERSATIONS_QUERY_KEY, 'list'],
  queryFn: async ({ pageParam }) => await fetchConversations(pageParam, PAGE_SIZE),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.offset + lastPage.conversations.length : undefined
}));

/**
 * A conversation with its messages, or nothing for a new chat that has no conversation yet.
 */
export const useConversation = (id: Nullable<string>): UseQueryResult<ConversationDetail> => useQuery(queryOptions({
  queryKey: getConversationQueryKey(id ?? ''),
  queryFn: async () => await fetchConversation(id ?? ''),
  enabled: id !== null
}));

/**
 * Refetches the list of conversations, such as after a message moves one to the top.
 */
export const invalidateConversationList = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY, 'list'] });
};

export const invalidateConversation = async (queryClient: QueryClient, id: string): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: getConversationQueryKey(id) });
};

export interface ConversationTurn {
  context: ContextUsage;
  conversation: ConversationRecord;
  // The message of the user followed by the reply.
  messages: MessageRecord[];
}

/**
 * Adds a turn the API just saved to the cached conversation, so it shows without refetching the whole conversation.
 */
export const addConversationTurn = (queryClient: QueryClient, { context, conversation, messages }: ConversationTurn): void => {
  queryClient.setQueryData<ConversationDetail>(getConversationQueryKey(conversation.id), (previous) => {
    const previousMessages = previous?.messages ?? [];
    const newMessages = messages.filter((message) => previousMessages.every((item) => item.id !== message.id));
    return { ...conversation, context, messages: [...previousMessages, ...newMessages] };
  });
};

export const useDeleteConversation = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteConversation(id);
    },
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: getConversationQueryKey(id) });
      await invalidateConversationList(queryClient);
    }
  });
};
