import { Dialog } from '@base-ui/react/dialog';
import { GenerationPost } from '@components/history/GenerationPost';
import { Button } from '@components/ui/third-party/shadcn/button';
import { toWiderGallery, WorkflowImageViewer } from '@components/workflow/WorkflowImageViewer';
import type { ImageGallery } from '@components/workflow/WorkflowImageViewer';
import type { GenerationRecord } from '@core/generations/generations';
import type { Nullable } from '@core/utils/types';
import { XIcon } from 'lucide-react';
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
 * Shows a generation from the grid view as a feed post, in a modal.
 */
export const GenerationPostDialog: FC<GenerationPostDialogProps> = ({ canDelete, galleryImages, generation, onClose }) => {
  // Keep showing the last generation after closing so it stays visible while the popup fades out.
  const [shownGeneration, setShownGeneration] = useState<Nullable<GenerationRecord>>(generation);
  const [gallery, setGallery] = useState<Nullable<ImageGallery>>(null);

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
              <GenerationPost framed generation={shownGeneration} onDeleted={canDelete ? onClose : undefined} onOpenImage={handleOpenImage} />
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
          <WorkflowImageViewer gallery={gallery} onClose={() => { setGallery(null); }} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
