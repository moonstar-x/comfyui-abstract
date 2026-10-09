import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { Nullable } from '@core/utils/types';
import { Download, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { FC, MouseEvent } from 'react';

export interface WorkflowImageViewerProps {
  onClose: () => void;
  url: Nullable<string>;
}

export const WorkflowImageViewer: FC<WorkflowImageViewerProps> = ({ url, onClose }) => {
  // Keep showing the last image after closing so it stays visible while the popup fades out.
  const [shownUrl, setShownUrl] = useState<Nullable<string>>(url);
  if (url !== null && url !== shownUrl) {
    setShownUrl(url);
  }

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

  return (
    <Dialog.Root open={url !== null} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 md:p-8" onClick={handlePopupClick}>
          <Dialog.Title className="sr-only">Workflow output</Dialog.Title>
          {shownUrl !== null && (
            <>
              <img alt="Workflow output" className="max-h-[calc(100dvh-7rem)] max-w-full rounded-lg object-contain shadow-2xl" src={shownUrl} />
              <a download className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white" href={shownUrl}>
                <Download aria-hidden="true" className="size-4" />
                Download
              </a>
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
