import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useGenerationSession } from '@components/generation/GenerationSessionContext';
import { useDeleteGeneration } from '@components/history/hooks/useGenerations';
import { Button } from '@components/ui/third-party/shadcn/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@components/ui/third-party/shadcn/dropdown-menu';
import type { GenerationRecord } from '@core/generations/generations';
import { downloadFile } from '@core/utils/files';
import type { WorkflowOutputKind } from '@core/workflows/outputs';
import { cn } from 'cn';
import { Download, EllipsisVertical, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FC } from 'react';

export interface WorkflowRunHistoryMenuProps {
  className?: string;
  generation: GenerationRecord;
  kind: WorkflowOutputKind;
  url: string;
}

/**
 * A three dot menu to download one file of a previous generation, or to delete the whole generation once the user confirms it in a dialog.
 */
export const WorkflowRunHistoryMenu: FC<WorkflowRunHistoryMenuProps> = ({ className, generation, kind, url }) => {
  const { remove } = useGenerationSession(kind);
  const { error, isPending, mutate, reset } = useDeleteGeneration();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // The dialog opens from a menu item that is gone once the menu closes, so focus goes back to the trigger instead.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileCount = generation.outputs.length;

  // A file that can't be fetched is opened in a new tab instead, so it can still be saved from there.
  const handleDownload = async (): Promise<void> => {
    try {
      await downloadFile(url);
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleDeleteClick = (): void => {
    reset();
    setIsDialogOpen(true);
  };

  // Stays open while deleting so the result is shown.
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isPending) {
      setIsDialogOpen(isOpen);
    }
  };

  // Also dropped from the session, otherwise it would come back as the latest result once the ones after it are deleted.
  const handleConfirm = (): void => {
    mutate(generation.id, {
      onSuccess: () => {
        setIsDialogOpen(false);
        remove(generation.promptId);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={triggerRef}
          render={<Button aria-label="Generation actions" className={cn('data-popup-open:opacity-100', className)} size="icon-sm" type="button" variant="outline" />}
        >
          <EllipsisVertical aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-36">
          <DropdownMenuItem onClick={() => { void handleDownload(); }}>
            <Download />
            Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog.Root open={isDialogOpen} onOpenChange={handleOpenChange}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
          <AlertDialog.Popup
            className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-1/2 flex-col gap-4 rounded-xl border bg-background p-4 shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
            finalFocus={triggerRef}
          >
            <div className="flex flex-col gap-1.5">
              <AlertDialog.Title className="text-base font-medium">Delete this generation?</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted-foreground">
                {fileCount > 1
                  ? `All ${fileCount.toString()} files of this run will be removed permanently, along with its entry in the history.`
                  : 'The file will be removed permanently, along with its entry in the history.'}
              </AlertDialog.Description>
            </div>
            {error !== null && <p className="text-sm text-destructive" role="alert">{error.message}</p>}
            <div className="flex justify-end gap-2">
              <AlertDialog.Close disabled={isPending} render={<Button variant="outline" />}>Cancel</AlertDialog.Close>
              <Button disabled={isPending} type="button" variant="destructive" onClick={handleConfirm}>
                {isPending ? 'Deleting…' : 'Confirm'}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
};
