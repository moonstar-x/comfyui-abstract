import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@components/ui/third-party/shadcn/button';
import { useDeleteUpload } from '@components/uploads/hooks/useUploads';
import { cn } from 'cn';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

export interface DeleteUploadButtonProps {
  className?: string;
  id: string;
}

/**
 * A trash button that deletes the upload once the user confirms it in a dialog.
 */
export const DeleteUploadButton: FC<DeleteUploadButtonProps> = ({ className, id }) => {
  const { error, isPending, mutate, reset } = useDeleteUpload();
  const [open, setOpen] = useState(false);

  // Stays open while deleting so the result is shown, and starts without the error of an earlier attempt.
  const handleOpenChange = (isOpen: boolean): void => {
    if (isPending) {
      return;
    }

    if (isOpen) {
      reset();
    }
    setOpen(isOpen);
  };

  const handleConfirm = (): void => {
    mutate(id, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger
        render={<Button aria-label="Delete upload" className={cn('cursor-pointer bg-background/80 shadow-sm backdrop-blur-xs hover:border-destructive hover:bg-destructive hover:text-white dark:hover:bg-destructive', className)} size="icon-sm" variant="outline" />}
      >
        <Trash2 aria-hidden="true" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-1/2 flex-col gap-4 rounded-xl border bg-background p-4 shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="text-base font-medium">Delete this upload?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              The file will be removed permanently and can no longer be used in workflows.
            </AlertDialog.Description>
          </div>
          {error !== null && <p className="text-sm text-destructive" role="alert">{error.message}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Close disabled={isPending} render={<Button className="cursor-pointer" variant="outline" />}>Cancel</AlertDialog.Close>
            <Button className="cursor-pointer" disabled={isPending} type="button" variant="destructive" onClick={handleConfirm}>
              {isPending ? 'Deleting…' : 'Confirm'}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
