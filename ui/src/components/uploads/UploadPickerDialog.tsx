import { Dialog } from '@base-ui/react/dialog';
import { Button } from '@components/ui/third-party/shadcn/button';
import { UploadList } from '@components/uploads/UploadList';
import type { MediaType } from '@core/generations/generations';
import type { UploadRecord } from '@services/api/uploads';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

export interface UploadPickerDialogProps {
  emptyMessage: string;
  /**
   * How many uploads can be picked at once. Defaults to 1, where picking another upload replaces the picked one.
   */
  maxSelected?: number;
  mediaType: MediaType;
  onClose: () => void;
  onSelect: (uploads: UploadRecord[]) => void;
  open: boolean;
  title: string;
}

/**
 * Lets the user pick some of their earlier uploads of the given media type from a grid, in a modal.
 * Clicking a tile only highlights it, the picked uploads are confirmed with the Select button.
 */
export const UploadPickerDialog: FC<UploadPickerDialogProps> = ({ emptyMessage, maxSelected = 1, mediaType, onClose, onSelect, open, title }) => {
  const [selected, setSelected] = useState<UploadRecord[]>([]);
  const [wasOpen, setWasOpen] = useState(open);

  // Starts every opening with nothing picked, while keeping the picks highlighted as the modal fades out.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected([]);
    }
  }

  const selectedIds = new Set(selected.map((upload) => upload.id));

  const handleToggle = (upload: UploadRecord): void => {
    if (selectedIds.has(upload.id)) {
      setSelected(selected.filter((item) => item.id !== upload.id));
    } else if (maxSelected === 1) {
      setSelected([upload]);
    } else if (selected.length < maxSelected) {
      setSelected([...selected, upload]);
    }
  };

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };

  const handleConfirm = (): void => {
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl -translate-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <Dialog.Title className="text-base font-medium">{title}</Dialog.Title>
            <Dialog.Close render={<Button size="icon-sm" variant="ghost" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <UploadList emptyMessage={emptyMessage} filter={{ mediaType }} selectedIds={selectedIds} onSelect={handleToggle} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
              {`Selected ${selected.length.toString()}/${maxSelected.toString()} files`}
            </p>
            <div className="flex gap-2">
              <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
              <Button disabled={selected.length === 0} type="button" onClick={handleConfirm}>Select</Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
