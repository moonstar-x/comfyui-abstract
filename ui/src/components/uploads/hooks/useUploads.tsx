import { deleteUpload, deleteUploads, fetchUploadFile, fetchUploads } from '@services/api/uploads';
import type { UploadsFilter, UploadsPage } from '@services/api/uploads';
import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryClient, UseInfiniteQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 24;

const UPLOADS_QUERY_KEY = 'uploads';

export const useUploads = ({ mediaType }: UploadsFilter): UseInfiniteQueryResult<InfiniteData<UploadsPage, number>> => useInfiniteQuery(infiniteQueryOptions({
  queryKey: [UPLOADS_QUERY_KEY, mediaType ?? null],
  queryFn: async ({ pageParam }) => await fetchUploads({ mediaType }, pageParam, PAGE_SIZE),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.offset + lastPage.uploads.length : undefined
}));

// Only the lists are refetched, the files of the remaining uploads haven't changed.
const invalidateUploadLists = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === UPLOADS_QUERY_KEY && query.queryKey[1] !== 'file' });
};

export const useDeleteUpload = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteUpload(id);
    },
    onSuccess: async () => {
      await invalidateUploadLists(queryClient);
    }
  });
};

export const useDeleteUploads = (): UseMutationResult<void, Error, readonly string[]> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: readonly string[]) => {
      await deleteUploads(ids);
    },
    // Also refetched when only some batches went through, so the list drops whatever was deleted.
    onSettled: async () => {
      await invalidateUploadLists(queryClient);
    }
  });
};

// Uploads never change, so the file is never refetched while it is cached.
const makeUploadFileQuery = (id: string): { queryFn: () => Promise<Blob>; queryKey: string[]; staleTime: number } => ({
  queryKey: [UPLOADS_QUERY_KEY, 'file', id],
  queryFn: async () => await fetchUploadFile(id),
  staleTime: Infinity
});

/**
 * Returns the file of an upload, from the cache when a tile already loaded it.
 */
export const useFetchUploadFile = (): (id: string) => Promise<Blob> => {
  const queryClient = useQueryClient();
  return async (id) => await queryClient.query(makeUploadFileQuery(id));
};

export interface UploadFileUrl {
  hasError: boolean;
  url: string | undefined;
}

/**
 * An object URL of the file of an upload, which is fetched with the session since the API doesn't serve it publicly.
 * The URL is revoked once it is no longer shown.
 */
export const useUploadFileUrl = (id: string): UploadFileUrl => {
  const { data: blob, isError } = useQuery(queryOptions(makeUploadFileQuery(id)));
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (blob === undefined) {
      return;
    }

    // Created in the effect rather than during render so StrictMode's second mount doesn't get a URL its first cleanup revoked.
    const objectUrl = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);

    return (): void => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return { hasError: isError, url };
};
