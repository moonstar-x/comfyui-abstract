import { AlertDialog } from '@base-ui/react/alert-dialog';
import type { Selection } from '@components/selection/hooks/useSelection';
import { Button } from '@components/ui/third-party/shadcn/button';
import type { UseMutationResult } from '@tanstack/react-query';
import { ListChecks, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

export interface SelectionActionsProps {
  /**
   * Explains what deleting the selected items does, shown when confirming it.
   */
  confirmDescription: string;
  deletion: UseMutationResult<void, Error, readonly string[]>;
  /**
   * What the items are called, such as generation, pluralized by appending an s.
   */
  itemName: string;
  selection: Selection;
}

const pluralize = (count: number, name: string): string => `${count.toString()} ${name}${count === 1 ? '' : 's'}`;

/**
 * The buttons of the action bar that enter select mode, and once in it, delete the selected items after confirming it.
 */
export const SelectionActions: FC<SelectionActionsProps> = ({ confirmDescription, deletion, itemName, selection }) => {
  const [open, setOpen] = useState(false);

  if (!selection.isSelecting) {
    return (
      <Button size="sm" type="button" variant="outline" onClick={selection.start}>
        <ListChecks aria-hidden="true" />
        Select
      </Button>
    );
  }

  const { error, isPending, mutate, reset } = deletion;
  const count = selection.selectedIds.size;

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
    mutate([...selection.selectedIds], {
      onSuccess: () => {
        setOpen(false);
        selection.stop();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span aria-live="polite" className="text-sm text-muted-foreground tabular-nums">{`${count.toString()} selected`}</span>
      <Button size="sm" type="button" variant="outline" onClick={selection.stop}>
        Cancel
      </Button>
      <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
        <AlertDialog.Trigger disabled={count === 0} render={<Button size="sm" variant="destructive" />}>
          <Trash2 aria-hidden="true" />
          Delete
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop forceRender className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-1/2 flex-col gap-4 rounded-xl border bg-background p-4 shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex flex-col gap-1.5">
              <AlertDialog.Title className="text-base font-medium">{`Delete ${pluralize(count, itemName)}?`}</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted-foreground">{confirmDescription}</AlertDialog.Description>
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
    </div>
  );
};
