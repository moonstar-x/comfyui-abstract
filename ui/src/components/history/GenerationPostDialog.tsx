import { Dialog } from '@base-ui/react/dialog';
import { GenerationPost } from '@components/history/GenerationPost';
import { Button } from '@components/ui/third-party/shadcn/button';
import { toWiderGallery, WorkflowImageViewer } from '@components/workflow/WorkflowImageViewer';
import type { ImageGallery } from '@components/workflow/WorkflowImageViewer';
import type { GenerationRecord } from '@core/generations/generations';
import type { Nullable } from '@core/utils/types';
import { useIsMobile } from '@hooks/useMobile';
import { ArrowLeft, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { FC, MouseEvent } from 'react';

export interface GenerationPostDialogProps {
  /**
   * Lets the post be deleted from the modal, which closes once it is.
   */
  canDelete: boolean;
  /**
   * The images of every generation in the list the post was opened from, which its image preview pages through.
   */
  galleryImages: readonly string[];
  generation: Nullable<GenerationRecord>;
  onClose: () => void;
}

/**
 * Shows a generation from the grid view as a feed post, in a modal. On phones it opens as a page of its own instead,
 * sliding in from the right with a back button, like navigating to a new screen of an app.
 */
export const GenerationPostDialog: FC<GenerationPostDialogProps> = ({ canDelete, galleryImages, generation, onClose }) => {
  // Keep showing the last generation after closing so it stays visible while the popup fades out.
  const [shownGeneration, setShownGeneration] = useState<Nullable<GenerationRecord>>(generation);
  const [gallery, setGallery] = useState<Nullable<ImageGallery>>(null);
  const isMobile = useIsMobile();

  if (generation !== null && generation !== shownGeneration) {
    setShownGeneration(generation);
    setGallery(null);
  }

  const handleOpenImage = (images: string[], index: number): void => {
    setGallery(toWiderGallery(galleryImages, images, index));
  };

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };

  // The popup fills the screen to center the post, so clicks on the empty area around it land on the popup itself rather than the backdrop.
  const handleOutsideClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleCloseImage = (): void => {
    setGallery(null);
  };

  const imageViewer = <WorkflowImageViewer gallery={gallery} onClose={handleCloseImage} />;

  if (isMobile) {
    return (
      <Dialog.Root open={generation !== null} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Popup className="fixed inset-0 z-50 flex flex-col scrollbar-none overflow-y-auto overscroll-contain bg-background transition-transform duration-300 ease-out outline-none data-ending-style:translate-x-full data-starting-style:translate-x-full">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-2 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur">
              <Dialog.Close render={<Button className="cursor-pointer" size="icon" type="button" variant="ghost" />}>
                <ArrowLeft aria-hidden="true" />
                <span className="sr-only">Back</span>
              </Dialog.Close>
              <Dialog.Title className="truncate text-base font-semibold">Post</Dialog.Title>
            </header>
            {shownGeneration !== null && (
              <GenerationPost frame="none" generation={shownGeneration} onDeleted={canDelete ? onClose : undefined} onOpenImage={handleOpenImage} />
            )}

            {/* Rendered inside the popup so it opens as a nested dialog, closing back to the post instead of the grid. */}
            {imageViewer}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={generation !== null} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup
          className="fixed inset-0 z-50 flex scrollbar-none overflow-y-auto overscroll-contain p-4 transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 md:p-8"
          onClick={handleOutsideClick}
        >
          {/* Auto margins center the post while letting a post taller than the screen scroll from its top. */}
          {shownGeneration !== null && (
            <div className="m-auto w-full max-w-xl">
              <Dialog.Title className="sr-only">{`${shownGeneration.username}'s generation`}</Dialog.Title>
              <GenerationPost frame="card" generation={shownGeneration} onDeleted={canDelete ? onClose : undefined} onOpenImage={handleOpenImage} />
            </div>
          )}
          <Dialog.Close
            render={(
              <Button
                className="fixed top-3 right-3 text-white hover:bg-white/10 hover:text-white"
                size="icon"
                variant="ghost"
              />
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Dialog.Close>

          {/* Rendered inside the popup so it opens as a nested dialog, closing back to the post instead of the grid. */}
          {imageViewer}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
