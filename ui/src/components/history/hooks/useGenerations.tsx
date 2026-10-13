import { deleteGeneration, fetchGenerationCount, fetchGenerations } from '@services/api/generations';
import type { GenerationsFilter, GenerationsPage } from '@services/api/generations';
import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryClient, UseInfiniteQueryResult, UseMutationResult, UseQueryResult } from '@tanstack/react-query';

const PAGE_SIZE = 24;

// Every history query starts with this, so a change to the history can refresh all of them at once.
export const GENERATIONS_QUERY_KEY = 'generations';

/**
 * Refetches every history query, such as after a generation is added or deleted.
 */
export const invalidateGenerationHistory = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: [GENERATIONS_QUERY_KEY] });
};

export const useGenerations = ({ username, mediaType }: GenerationsFilter): UseInfiniteQueryResult<InfiniteData<GenerationsPage, number>> => useInfiniteQuery(infiniteQueryOptions({
  queryKey: [GENERATIONS_QUERY_KEY, username ?? null, mediaType ?? null],
  queryFn: async ({ pageParam }) => await fetchGenerations({ username, mediaType }, pageParam, PAGE_SIZE),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.offset + lastPage.generations.length : undefined
}));

/**
 * How many generations the current user has made. Kept under the history query key so it refreshes along with the history.
 */
export const useGenerationCount = (): UseQueryResult<number> => useQuery(queryOptions({
  queryKey: [GENERATIONS_QUERY_KEY, 'count'],
  queryFn: fetchGenerationCount
}));

export const useDeleteGeneration = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteGeneration(id);
    },
    onSuccess: async () => {
      await invalidateGenerationHistory(queryClient);
    }
  });
};
