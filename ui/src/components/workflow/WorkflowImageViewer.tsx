import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/third-party/shadcn/select';
import { useSlideshow } from '@components/workflow/hooks/useSlideshow';
import type { Nullable } from '@core/utils/types';
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize, Pause, Play, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FC, KeyboardEvent, MouseEvent, TouchEvent } from 'react';

// Horizontal distance a touch has to travel to count as a swipe rather than a tap.
const SWIPE_THRESHOLD_PX = 50;

// How many seconds each image can stay on screen while the slideshow is playing.
const SLIDESHOW_INTERVAL_OPTIONS: readonly number[] = [1, 2, 3, 5, 10];
const DEFAULT_SLIDESHOW_INTERVAL_S = 3;
const SLIDESHOW_INTERVAL_ITEMS = SLIDESHOW_INTERVAL_OPTIONS.map((seconds) => ({ value: seconds, label: `${seconds.toString()}s` }));
const SLIDESHOW_INTERVAL_STORAGE_KEY = 'comfyui-abstract-slideshow-interval';

// Falls back to the default when nothing is stored or the stored value is no longer one of the options.
const readStoredSlideshowInterval = (): number => {
  try {
    const stored = Number(localStorage.getItem(SLIDESHOW_INTERVAL_STORAGE_KEY));
    return SLIDESHOW_INTERVAL_OPTIONS.includes(stored) ? stored : DEFAULT_SLIDESHOW_INTERVAL_S;
  } catch {
    return DEFAULT_SLIDESHOW_INTERVAL_S;
  }
};

const storeSlideshowInterval = (seconds: number): void => {
  try {
    localStorage.setItem(SLIDESHOW_INTERVAL_STORAGE_KEY, seconds.toString());
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this session.
  }
};

export interface ImageGallery {
  images: readonly string[];
  index: number;
}

/**
 * Opens the clicked image within a wider set of images, so the preview pages through more than the ones it was opened from.
 * Falls back to the original images when the clicked one isn't part of the wider set.
 */
export const toWiderGallery = (allImages: readonly string[], images: readonly string[], index: number): ImageGallery => {
  const url = images[index];
  const widerIndex = url === undefined ? -1 : allImages.indexOf(url);

  return widerIndex === -1 ? { images, index } : { images: allImages, index: widerIndex };
};

type SlideDirection = 'next' | 'previous';

interface OutgoingImage {
  direction: SlideDirection;
  index: number;
}

const IMAGE_CLASSES = 'col-start-1 row-start-1 max-h-[calc(100dvh-7rem)] max-w-full rounded-lg object-contain shadow-2xl';

// Sized to the viewport rather than capped by it so smaller images scale up to fit the screen.
const FULLSCREEN_IMAGE_CLASSES = 'col-start-1 row-start-1 h-dvh w-dvw object-contain';

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
  isFullscreen: boolean;
  onOutgoingEnd: () => void;
  outgoing: Nullable<OutgoingImage>;
}

// Both images share one grid cell so the outgoing one slides away over the spot where the incoming one lands.
const ImageStage: FC<ImageStageProps> = ({ images, index, isFullscreen, outgoing, onOutgoingEnd }) => {
  const url = images[index];
  const imageClasses = isFullscreen ? FULLSCREEN_IMAGE_CLASSES : IMAGE_CLASSES;
  const outgoingUrl = outgoing === null ? undefined : images[outgoing.index];

  return (
    <div className="grid place-items-center">
      {outgoing !== null && outgoingUrl !== undefined && (
        <img
          alt=""
          aria-hidden="true"
          className={`pointer-events-none ${imageClasses} ${SLIDE_OUT_CLASSES[outgoing.direction]}`}
          key={outgoing.index}
          src={outgoingUrl}
          onAnimationEnd={onOutgoingEnd}
        />
      )}
      <img
        alt={images.length > 1 ? `Preview ${(index + 1).toString()} of ${images.length.toString()}` : 'Preview'}
        className={outgoing === null ? imageClasses : `${imageClasses} ${SLIDE_IN_CLASSES[outgoing.direction]}`}
        key={index}
        src={url}
      />
    </div>
  );
};

const TOOLBAR_BUTTON_CLASSES = 'cursor-pointer bg-black/30 text-white hover:bg-white/15 hover:text-white';

// The trigger's own background and icon colors are meant for the page, not for sitting over the dark preview.
const INTERVAL_TRIGGER_CLASSES = 'border-white/20 bg-black/30 text-white hover:bg-white/15 dark:bg-black/30 dark:hover:bg-white/15 [&_svg]:text-white/70';

interface ViewerToolbarProps {
  canPlay: boolean;
  intervalSeconds: number;
  isFullscreen: boolean;
  isPlaying: boolean;
  onIntervalChange: (seconds: number) => void;
  onToggleFullscreen: () => void;
  onTogglePlay: () => void;
}

const ViewerToolbar: FC<ViewerToolbarProps> = ({ canPlay, intervalSeconds, isFullscreen, isPlaying, onIntervalChange, onTogglePlay, onToggleFullscreen }) => (
  <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
    {canPlay && (
      <Select<number>
        items={SLIDESHOW_INTERVAL_ITEMS}
        value={intervalSeconds}
        onValueChange={(seconds) => {
          if (seconds !== null) {
            onIntervalChange(seconds);
          }
        }}
      >
        <SelectTrigger aria-label="Seconds between slides" className={INTERVAL_TRIGGER_CLASSES}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SLIDESHOW_INTERVAL_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
    {canPlay && (
      <Button aria-pressed={isPlaying} className={TOOLBAR_BUTTON_CLASSES} size="icon" variant="ghost" onClick={onTogglePlay}>
        {isPlaying ? <Pause /> : <Play />}
        <span className="sr-only">{isPlaying ? 'Pause slideshow' : 'Play slideshow'}</span>
      </Button>
    )}
    <Button aria-pressed={isFullscreen} className={TOOLBAR_BUTTON_CLASSES} size="icon" variant="ghost" onClick={onToggleFullscreen}>
      {isFullscreen ? <Minimize /> : <Maximize />}
      <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
    </Button>
    <Dialog.Close render={<Button className={TOOLBAR_BUTTON_CLASSES} size="icon" variant="ghost" />}>
      <XIcon />
      <span className="sr-only">Close</span>
    </Dialog.Close>
  </div>
);

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
  // Stays inside the popup rather than using the Fullscreen API, it only drops the footer and lets the image fill the screen.
  const [isFullscreen, setIsFullscreen] = useState(false);

  const images = shownGallery?.images ?? [];
  const url = images[index] ?? null;

  const goTo = (next: number, direction: SlideDirection = next > index ? 'next' : 'previous'): void => {
    if (next === index || next < 0 || next >= images.length) {
      return;
    }

    setOutgoing({ direction, index });
    setIndex(next);
  };

  const [intervalSeconds, setIntervalSeconds] = useState(readStoredSlideshowInterval);

  // Wraps back to the first image so the slideshow loops, still sliding forward.
  const { isPlaying, setIsPlaying } = useSlideshow(index, intervalSeconds * 1000, () => {
    goTo((index + 1) % images.length, 'next');
  });

  if (gallery !== null && gallery !== shownGallery) {
    setShownGallery(gallery);
    setIndex(gallery.index);
    setOutgoing(null);
    setIsPlaying(false);
  }

  const close = (): void => {
    setIsPlaying(false);
    setIsFullscreen(false);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      close();
    }
  };

  // The popup fills the screen to center the image, so clicks on the empty area around it land on the popup itself rather than the backdrop.
  const handlePopupClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      close();
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

  const navigationButtonClasses = 'absolute top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-black/30 text-white hover:bg-white/15 hover:text-white disabled:opacity-0';
  const popupLayoutClasses = isFullscreen ? 'bg-black' : 'gap-3 p-4 md:p-8';

  return (
    <Dialog.Root open={gallery !== null} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Forced so that when nested (e.g. over a post dialog) it stacks on the parent's backdrop and darkens further. */}
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 ${popupLayoutClasses}`}
          onClick={handlePopupClick}
          onKeyDown={handleKeyDown}
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          <Dialog.Title className="sr-only">Image preview</Dialog.Title>
          {url !== null && (
            <>
              <ImageStage images={images} index={index} isFullscreen={isFullscreen} outgoing={outgoing} onOutgoingEnd={() => { setOutgoing(null); }} />
              <div className={`flex items-center gap-4 text-sm text-white/80 ${isFullscreen ? 'hidden' : ''}`}>
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
                disabled={index === 0}
                size="icon-lg"
                variant="ghost"
                onClick={() => { goTo(index - 1); }}
              >
                <ChevronLeft />
                <span className="sr-only">Previous image</span>
              </Button>
              <Button
                className={`${navigationButtonClasses} right-2 md:right-4`}
                disabled={index === images.length - 1}
                size="icon-lg"
                variant="ghost"
                onClick={() => { goTo(index + 1); }}
              >
                <ChevronRight />
                <span className="sr-only">Next image</span>
              </Button>
            </>
          )}
          <ViewerToolbar
            canPlay={images.length > 1}
            intervalSeconds={intervalSeconds}
            isFullscreen={isFullscreen}
            isPlaying={isPlaying}
            onIntervalChange={(seconds) => {
              setIntervalSeconds(seconds);
              storeSlideshowInterval(seconds);
            }}
            onToggleFullscreen={() => { setIsFullscreen(!isFullscreen); }}
            onTogglePlay={() => { setIsPlaying(!isPlaying); }}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
