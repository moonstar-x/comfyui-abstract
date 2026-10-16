import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { Nullable } from '@core/utils/types';
import { ChevronLeft, ChevronRight, Download, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FC, KeyboardEvent, MouseEvent, TouchEvent } from 'react';

// Horizontal distance a touch has to travel to count as a swipe rather than a tap.
const SWIPE_THRESHOLD_PX = 50;

export interface ImageGallery {
  images: readonly string[];
  index: number;
}

type SlideDirection = 'next' | 'previous';

interface OutgoingImage {
  direction: SlideDirection;
  index: number;
}

const IMAGE_CLASSES = 'col-start-1 row-start-1 max-h-[calc(100dvh-7rem)] max-w-full rounded-lg object-contain shadow-2xl';

const SLIDE_IN_CLASSES: Record<SlideDirection, string> = {
  next: 'animate-in fade-in slide-in-from-right-16 duration-200 motion-reduce:animate-none',
  previous: 'animate-in fade-in slide-in-from-left-16 duration-200 motion-reduce:animate-none'
};

// Kept after the animation ends so it doesn't flash back in before it's unmounted.
const SLIDE_OUT_CLASSES: Record<SlideDirection, string> = {
  next: 'animate-out fade-out slide-out-to-left-16 duration-200 fill-mode-forwards motion-reduce:hidden',
  previous: 'animate-out fade-out slide-out-to-right-16 duration-200 fill-mode-forwards motion-reduce:hidden'
};

interface ImageStageProps {
  images: readonly string[];
  index: number;
  onOutgoingEnd: () => void;
  outgoing: Nullable<OutgoingImage>;
}

// Both images share one grid cell so the outgoing one slides away over the spot where the incoming one lands.
const ImageStage: FC<ImageStageProps> = ({ images, index, outgoing, onOutgoingEnd }) => {
  const url = images[index];
  const outgoingUrl = outgoing === null ? undefined : images[outgoing.index];

  return (
    <div className="grid place-items-center">
      {outgoing !== null && outgoingUrl !== undefined && (
        <img
          alt=""
          aria-hidden="true"
          className={`pointer-events-none ${IMAGE_CLASSES} ${SLIDE_OUT_CLASSES[outgoing.direction]}`}
          key={outgoing.index}
          src={outgoingUrl}
          onAnimationEnd={onOutgoingEnd}
        />
      )}
      <img
        alt={images.length > 1 ? `Preview ${(index + 1).toString()} of ${images.length.toString()}` : 'Preview'}
        className={outgoing === null ? IMAGE_CLASSES : `${IMAGE_CLASSES} ${SLIDE_IN_CLASSES[outgoing.direction]}`}
        key={index}
        src={url}
      />
    </div>
  );
};

export interface WorkflowImageViewerProps {
  gallery: Nullable<ImageGallery>;
  onClose: () => void;
}

export const WorkflowImageViewer: FC<WorkflowImageViewerProps> = ({ gallery, onClose }) => {
  // Keep showing the last gallery after closing so it stays visible while the popup fades out.
  const [shownGallery, setShownGallery] = useState<Nullable<ImageGallery>>(gallery);
  const [index, setIndex] = useState(gallery?.index ?? 0);
  const [outgoing, setOutgoing] = useState<Nullable<OutgoingImage>>(null);
  const touchStartXRef = useRef<Nullable<number>>(null);

  if (gallery !== null && gallery !== shownGallery) {
    setShownGallery(gallery);
    setIndex(gallery.index);
    setOutgoing(null);
  }

  const images = shownGallery?.images ?? [];
  const url = images[index] ?? null;
  const hasPrevious = index > 0;
  const hasNext = index < images.length - 1;

  const goTo = (next: number): void => {
    if (next === index || next < 0 || next >= images.length) {
      return;
    }

    setOutgoing({ direction: next > index ? 'next' : 'previous', index });
    setIndex(next);
  };

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };

  // The popup fills the screen to center the image, so clicks on the empty area around it land on the popup itself rather than the backdrop.
  const handlePopupClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>): void => {
    touchStartXRef.current = event.touches.length === 1 ? event.touches[0]?.clientX ?? null : null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>): void => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartXRef.current = null;
    if (startX === null || endX === undefined) {
      return;
    }

    const deltaX = endX - startX;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
      goTo(deltaX < 0 ? index + 1 : index - 1);
    }
  };

  const navigationButtonClasses = 'absolute top-1/2 z-10 -translate-y-1/2 bg-black/30 text-white hover:bg-white/15 hover:text-white disabled:opacity-0';

  return (
    <Dialog.Root open={gallery !== null} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Forced so that when nested (e.g. over a post dialog) it stacks on the parent's backdrop and darkens further. */}
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden p-4 transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 md:p-8"
          onClick={handlePopupClick}
          onKeyDown={handleKeyDown}
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          <Dialog.Title className="sr-only">Image preview</Dialog.Title>
          {url !== null && (
            <>
              <ImageStage images={images} index={index} outgoing={outgoing} onOutgoingEnd={() => { setOutgoing(null); }} />
              <div className="flex items-center gap-4 text-sm text-white/80">
                {images.length > 1 && (
                  <span aria-live="polite" className="tabular-nums">{`${(index + 1).toString()} / ${images.length.toString()}`}</span>
                )}
                <a download className="inline-flex items-center gap-1.5 hover:text-white" href={url}>
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </a>
              </div>
            </>
          )}
          {images.length > 1 && (
            <>
              <Button
                className={`${navigationButtonClasses} left-2 md:left-4`}
                disabled={!hasPrevious}
                size="icon-lg"
                variant="ghost"
                onClick={() => { goTo(index - 1); }}
              >
                <ChevronLeft />
                <span className="sr-only">Previous image</span>
              </Button>
              <Button
                className={`${navigationButtonClasses} right-2 md:right-4`}
                disabled={!hasNext}
                size="icon-lg"
                variant="ghost"
                onClick={() => { goTo(index + 1); }}
              >
                <ChevronRight />
                <span className="sr-only">Next image</span>
              </Button>
            </>
          )}
          <Dialog.Close
            render={(
              <Button
                className="absolute top-3 right-3 text-white hover:bg-white/10 hover:text-white"
                size="icon"
                variant="ghost"
              />
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
