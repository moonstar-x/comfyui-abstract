import { isMediaType } from '@core/generations/generations';
import type { MediaType } from '@core/generations/generations';
import type { Optional } from '@core/utils/types';
import { useSearchParams } from 'react-router';

const MEDIA_TYPE_SEARCH_PARAM = 'type';

/**
 * The media type filter lives in the URL so it is kept when sharing a link or moving between history pages.
 */
export const useMediaTypeParam = (): [Optional<MediaType>, (value: Optional<MediaType>) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(MEDIA_TYPE_SEARCH_PARAM);
  const mediaType = isMediaType(raw) ? raw : undefined;

  const setMediaType = (value: Optional<MediaType>): void => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (value === undefined) {
        params.delete(MEDIA_TYPE_SEARCH_PARAM);
      } else {
        params.set(MEDIA_TYPE_SEARCH_PARAM, value);
      }

      return params;
    }, { replace: true });
  };

  return [mediaType, setMediaType];
};
