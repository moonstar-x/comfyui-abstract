import { AlertDialog } from '@base-ui/react/alert-dialog';
import type { Generation } from '@components/generation/GenerationSessionContext';
import { useGenerationSession } from '@components/generation/GenerationSessionContext';
import { useDeleteGeneration } from '@components/history/hooks/useGenerations';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

export interface DeleteRunResultButtonProps {
  generation: Generation;
  /**
   * The generation's id, taken apart since only stored generations can be deleted.
   */
  generationId: string;
}

/**
 * Deletes the generation of a run result once the user confirms it in a dialog, and drops the result from the session.
 */
export const DeleteRunResultButton: FC<DeleteRunResultButtonProps> = ({ generation, generationId }) => {
  const { remove } = useGenerationSession(generation.kind);
  const { error, isPending, mutate, reset } = useDeleteGeneration();
  const [open, setOpen] = useState(false);
  const fileCount = generation.files.length;

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
    mutate(generationId, {
      onSuccess: () => {
        setOpen(false);
        remove(generation.promptId);
      }
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger render={<Button className="cursor-pointer hover:border-destructive hover:bg-destructive hover:text-white dark:hover:bg-destructive" size="sm" variant="outline" />}>
        <Trash2 aria-hidden="true" data-icon="inline-start" />
        Delete
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-1/2 flex-col gap-4 rounded-xl border bg-background p-4 shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
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
