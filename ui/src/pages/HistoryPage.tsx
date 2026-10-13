import { useAuth } from '@components/auth/AuthContext';
import { FeedViewToggle } from '@components/history/FeedViewToggle';
import { GenerationList } from '@components/history/GenerationList';
import { useFeedViewParam } from '@components/history/hooks/useFeedViewParam';
import { useMediaTypeParam } from '@components/history/hooks/useMediaTypeParam';
import { MediaTypeFilter } from '@components/history/MediaTypeFilter';
import { CATEGORY_TILE_CLASSES } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { CURRENT_USER } from '@services/api/generations';
import type { FC } from 'react';
import { useParams } from 'react-router';

interface HistoryScope {
  emptyMessage: string;
  /**
   * Only the history of other users shows its title, the pages linked from the sidebar just keep the filter.
   */
  hasHeader: boolean;
  title: string;
  username: string | undefined;
}

const getScope = (username: string | undefined, currentUsername: string | undefined): HistoryScope => {
  if (username === undefined) {
    return { emptyMessage: 'Nobody has generated anything yet', hasHeader: false, title: 'Feed', username: undefined };
  }

  if (username === CURRENT_USER || username === currentUsername) {
    return { emptyMessage: 'You have not generated anything yet', hasHeader: false, title: 'My Generations', username: CURRENT_USER };
  }

  return { emptyMessage: `${username} has not generated anything yet`, hasHeader: true, title: `${username}'s Generations`, username };
};

const HistoryPage: FC = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const [mediaType, setMediaType] = useMediaTypeParam();
  const [feedView, setFeedView] = useFeedViewParam();
  const scope = getScope(username, user?.username);
  const isFeed = scope.username === undefined;
  const isOwnHistory = scope.username === CURRENT_USER;

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      {scope.hasHeader
        ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col items-start gap-2">
                <Badge className={CATEGORY_TILE_CLASSES.general}>History</Badge>
                <h1 className="text-2xl font-semibold tracking-tight">{scope.title}</h1>
              </div>
              <MediaTypeFilter value={mediaType} onChange={setMediaType} />
            </div>
          )
        : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="sr-only">{scope.title}</h1>
              <MediaTypeFilter value={mediaType} onChange={setMediaType} />
              {isFeed && <FeedViewToggle value={feedView} onChange={setFeedView} />}
            </div>
          )}

      {/* Keyed so the image viewer and delete confirmations don't carry over between users. */}
      <GenerationList
        allowDelete={!isFeed}
        emptyMessage={mediaType === undefined ? scope.emptyMessage : `${scope.emptyMessage} of this type`}
        filter={{ mediaType, username: scope.username }}
        key={scope.username ?? ''}
        variant={isFeed ? feedView : (isOwnHistory ? 'grid' : 'timeline')}
      />
    </div>
  );
};

export default HistoryPage;
