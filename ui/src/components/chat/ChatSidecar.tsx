import { useChat } from '@components/chat/ChatContext';
import { ChatPanel } from '@components/chat/ChatPanel';
import { Sheet, SheetContent, SheetTitle } from '@components/ui/third-party/shadcn/sheet';
import type { Nullable } from '@core/utils/types';
import { useIsMobile } from '@hooks/useMobile';
import { cn } from 'cn';
import { useRef, useState } from 'react';
import type { FC, KeyboardEvent, PointerEvent } from 'react';

const MIN_WIDTH = 320;
const MAX_WIDTH = 760;
// Left for the page and the app sidebar, so the chat can't squeeze them away.
const MIN_PAGE_WIDTH = 480;
const KEYBOARD_STEP = 24;

const clampWidth = (width: number): number => {
  const maxWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - MIN_PAGE_WIDTH));
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), maxWidth));
};

interface DragState {
  startWidth: number;
  startX: number;
}

/**
 * The chat on desktop, docked on the right and pushing the page aside. Dragging its left edge resizes it.
 */
const DesktopChatSidecar: FC = () => {
  const { isOpen, updateWidth, width: storedWidth } = useChat();
  const dragRef = useRef<Nullable<DragState>>(null);
  const [dragWidth, setDragWidth] = useState<Nullable<number>>(null);
  // The stored width may not fit a window that got smaller since.
  const width = dragWidth ?? clampWidth(storedWidth);
  const isResizing = dragWidth !== null;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startWidth: width, startX: event.clientX };
    setDragWidth(width);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current;
    if (drag !== null) {
      // The handle is on the left edge, so moving left makes the chat wider.
      setDragWidth(clampWidth(drag.startWidth + drag.startX - event.clientX));
    }
  };

  const handlePointerEnd = (): void => {
    if (dragRef.current === null) {
      return;
    }

    dragRef.current = null;
    // Only stored once the drag ends, rather than on every move.
    if (dragWidth !== null) {
      updateWidth(dragWidth);
    }
    setDragWidth(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!(event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      return;
    }

    event.preventDefault();
    updateWidth(clampWidth(width + (event.key === 'ArrowLeft' ? KEYBOARD_STEP : -KEYBOARD_STEP)));
  };

  return (
    <aside
      aria-label="Chat"
      inert={!isOpen}
      style={{ width: isOpen ? width : 0 }}
      className={cn(
        'sticky top-0 h-svh shrink-0 self-start overflow-hidden',
        isOpen && 'border-l',
        // Resizing follows the pointer, only opening and closing animate.
        !isResizing && 'transition-[width] duration-200 ease-linear motion-reduce:transition-none',
        isResizing && 'select-none'
      )}
    >
      {/* Keeps its width while the sidecar animates, so the chat slides in instead of reflowing. */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width }}>
        {/* Dragged with the pointer, or moved with the arrow keys once focused. */}
        <button
          aria-label="Resize chat"
          title="Drag to resize"
          type="button"
          onKeyDown={handleKeyDown}
          onLostPointerCapture={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          className={cn(
            'absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize touch-none outline-none',
            'after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:transition-colors hover:after:bg-border focus-visible:after:bg-ring',
            isResizing && 'after:bg-ring'
          )}
        />
        <ChatPanel />
      </div>
    </aside>
  );
};

/**
 * The chat on mobile, as a drawer from the right that takes the whole screen.
 */
const MobileChatDrawer: FC = () => {
  const { isOpen, setOpen } = useChat();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-none"
        showCloseButton={false}
        side="right"
      >
        <SheetTitle className="sr-only">Chat</SheetTitle>
        <ChatPanel />
      </SheetContent>
    </Sheet>
  );
};

export const ChatSidecar: FC = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileChatDrawer /> : <DesktopChatSidecar />;
};
