import { useChat } from '@components/chat/ChatContext';
import { ChatToggleButton } from '@components/chat/ChatToggleButton';
import { ComfyUiStatus } from '@components/comfyui/ComfyUiStatus';
import { Separator } from '@components/ui/third-party/shadcn/separator';
import { SidebarTrigger } from '@components/ui/third-party/shadcn/sidebar';
import { cn } from 'cn';
import { useLayoutEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';

/**
 * Holds the items on the right of the header. When the page gets too narrow for them, such as when the chat is open, they are cut off
 * from the left, so the items on the right stay visible the longest. The cut edge fades out.
 */
const HeaderOverflowArea: FC<{ children: ReactNode }> = ({ children }) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const content = contentRef.current;
    if (area === null || content === null) {
      return;
    }

    const measure = (): void => {
      // The content overflows to the left, where it can't be scrolled to, so its own width is compared instead of scrollWidth.
      setIsOverflowing(content.offsetWidth > area.clientWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(content);
    return (): void => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={areaRef}
      className={cn(
        'flex min-w-0 flex-1 justify-end overflow-hidden',
        isOverflowing && 'mask-[linear-gradient(to_right,transparent,black_1.5rem)]'
      )}
    >
      <div className="flex w-max shrink-0 items-center gap-1" ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export const AppHeader: FC = () => {
  const { isOpen } = useChat();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1 shrink-0 cursor-pointer" />
      <Separator className="mx-1 h-4 shrink-0 self-center!" orientation="vertical" />
      <HeaderOverflowArea>
        <ComfyUiStatus />
      </HeaderOverflowArea>
      {/* The open chat has its own button to hide it. */}
      {!isOpen && <ChatToggleButton />}
    </header>
  );
};
