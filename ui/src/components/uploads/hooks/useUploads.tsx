import { fetchUploadFile, fetchUploads } from '@services/api/uploads';
import type { UploadsFilter, UploadsPage } from '@services/api/uploads';
import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 24;

const UPLOADS_QUERY_KEY = 'uploads';

export const useUploads = ({ mediaType }: UploadsFilter): UseInfiniteQueryResult<InfiniteData<UploadsPage, number>> => useInfiniteQuery(infiniteQueryOptions({
  queryKey: [UPLOADS_QUERY_KEY, mediaType ?? null],
  queryFn: async ({ pageParam }) => await fetchUploads({ mediaType }, pageParam, PAGE_SIZE),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.offset + lastPage.uploads.length : undefined
}));

export interface UploadFileUrl {
  hasError: boolean;
  url: string | undefined;
}

/**
 * An object URL of the file of an upload, which is fetched with the session since the API doesn't serve it publicly.
 * Uploads never change, so the file is never refetched while it is cached. The URL is revoked once it is no longer shown.
 */
export const useUploadFileUrl = (id: string): UploadFileUrl => {
  const { data: blob, isError } = useQuery(queryOptions({
    queryKey: [UPLOADS_QUERY_KEY, 'file', id],
    queryFn: async () => await fetchUploadFile(id),
    staleTime: Infinity
  }));
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
