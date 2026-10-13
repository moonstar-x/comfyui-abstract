import { useSearchParams } from 'react-router';

const FEED_VIEW_SEARCH_PARAM = 'view';

export const FEED_VIEWS = ['feed', 'grid'] as const;
export type FeedView = typeof FEED_VIEWS[number];

const DEFAULT_FEED_VIEW: FeedView = 'feed';

const FEED_VIEW_VALUES: readonly string[] = FEED_VIEWS;

const isFeedView = (value: unknown): value is FeedView => typeof value === 'string' && FEED_VIEW_VALUES.includes(value);

/**
 * The feed view lives in the URL, like the media type filter, so it is kept when sharing a link or reloading.
 */
export const useFeedViewParam = (): [FeedView, (value: FeedView) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(FEED_VIEW_SEARCH_PARAM);
  const view = isFeedView(raw) ? raw : DEFAULT_FEED_VIEW;

  const setView = (value: FeedView): void => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (value === DEFAULT_FEED_VIEW) {
        params.delete(FEED_VIEW_SEARCH_PARAM);
      } else {
        params.set(FEED_VIEW_SEARCH_PARAM, value);
      }

      return params;
    }, { replace: true });
  };

  return [view, setView];
};
