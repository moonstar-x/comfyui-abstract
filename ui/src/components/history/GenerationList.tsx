import { useAuth } from '@components/auth/AuthContext';
import { GenerationCard } from '@components/history/GenerationCard';
import { GenerationPost } from '@components/history/GenerationPost';
import { GenerationPostDialog } from '@components/history/GenerationPostDialog';
import { GenerationTile } from '@components/history/GenerationTile';
import { useGenerations } from '@components/history/hooks/useGenerations';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { toWiderGallery, WorkflowImageViewer } from '@components/workflow/WorkflowImageViewer';
import type { ImageGallery } from '@components/workflow/WorkflowImageViewer';
import { groupGenerationsByDay } from '@core/generations/generations';
import type { GenerationRecord } from '@core/generations/generations';
import type { Nullable } from '@core/utils/types';
import { toOutputUrl } from '@core/workflows/outputs';
import type { GenerationsFilter } from '@services/api/generations';
import { cn } from 'cn';
import { useState } from 'react';
import type { FC, ReactNode } from 'react';

const Placeholder: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex min-h-60 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 p-4 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const FEED_COLUMN_CLASSES = 'mx-auto w-full max-w-xl';

const GRID_CLASSES = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

const LoadingList: FC<{ variant: GenerationListVariant }> = ({ variant }) => {
  if (variant === 'grid') {
    return (
      <div aria-busy="true" aria-label="Loading generations" className={GRID_CLASSES}>
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton className="aspect-square rounded-xl" key={index} />
        ))}
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-label="Loading generations" className={cn('flex flex-col gap-3', variant === 'feed' && FEED_COLUMN_CLASSES)}>
      {[0, 1, 2].map((index) => (
        <Skeleton className={cn('rounded-xl', variant === 'feed' ? 'h-96' : 'h-40')} key={index} />
      ))}
    </div>
  );
};

/**
 * The feed shows generations as social media posts, and the grid as previews that open the post.
 * The timeline groups the generations of one user by day.
 */
export type GenerationListVariant = 'feed' | 'grid' | 'timeline';

export interface GenerationListProps {
  /**
   * Lets the current user delete their own generations from the list.
   */
  allowDelete: boolean;
  emptyMessage: string;
  filter: GenerationsFilter;
  variant: GenerationListVariant;
}

export const GenerationList: FC<GenerationListProps> = ({ allowDelete, emptyMessage, filter, variant }) => {
  const { user } = useAuth();
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useGenerations(filter);
  const [gallery, setGallery] = useState<Nullable<ImageGallery>>(null);
  const [openedGeneration, setOpenedGeneration] = useState<Nullable<GenerationRecord>>(null);

  if (isPending) {
    return <LoadingList variant={variant} />;
  }

  if (error !== null) {
    return <Placeholder>{error.message}</Placeholder>;
  }

  const generations = data.pages.flatMap((page) => page.generations);
  if (generations.length === 0) {
    return <Placeholder>{emptyMessage}</Placeholder>;
  }

  const canDelete = (generation: GenerationRecord): boolean => allowDelete && generation.username === user?.username;

  // Every loaded image in list order, so the preview and its slideshow carry on into the other generations.
  const imageUrls = generations
    .filter((generation) => generation.mediaType === 'image')
    .flatMap((generation) => generation.outputs.map((output) => toOutputUrl(output)));

  const handleOpenImage = (images: string[], index: number): void => {
    setGallery(toWiderGallery(imageUrls, images, index));
  };

  const renderGenerations = (): ReactNode => {
    switch (variant) {
      case 'feed':
        return generations.map((generation) => (
          <GenerationPost generation={generation} key={generation.id} onOpenImage={handleOpenImage} />
        ));
      case 'grid':
        return (
          <div className={GRID_CLASSES}>
            {generations.map((generation) => (
              <GenerationTile generation={generation} key={generation.id} onOpen={() => { setOpenedGeneration(generation); }} />
            ))}
          </div>
        );
      case 'timeline':
        return groupGenerationsByDay(generations).map((day) => (
          <section aria-label={day.label} className="flex flex-col gap-3" key={day.key}>
            <h2 className="sticky top-14 z-[5] -mx-1 bg-background/85 px-1 py-1 text-sm font-semibold text-muted-foreground backdrop-blur">{day.label}</h2>
            {day.generations.map((generation) => (
              <GenerationCard canDelete={canDelete(generation)} generation={generation} key={generation.id} onOpenImage={handleOpenImage} />
            ))}
          </section>
        ));
    }
  };

  return (
    <div className={cn('flex flex-col', variant === 'feed' ? cn(FEED_COLUMN_CLASSES, 'sm:gap-4') : 'gap-6')}>
      {renderGenerations()}

      {hasNextPage && (
        <Button className="mt-4 self-center" disabled={isFetchingNextPage} type="button" variant="outline" onClick={() => { void fetchNextPage(); }}>
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}

      <WorkflowImageViewer gallery={gallery} onClose={() => { setGallery(null); }} />
      <GenerationPostDialog
        canDelete={openedGeneration !== null && canDelete(openedGeneration)}
        galleryImages={imageUrls}
        generation={openedGeneration}
        onClose={() => { setOpenedGeneration(null); }}
      />
    </div>
  );
};
