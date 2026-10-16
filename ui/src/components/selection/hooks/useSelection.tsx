import { useCallback, useMemo, useState } from 'react';

export interface Selection {
  /**
   * Unselects everything while staying in select mode.
   */
  clear: () => void;
  isSelecting: boolean;
  selectedIds: ReadonlySet<string>;
  start: () => void;
  /**
   * Leaves select mode, unselecting everything.
   */
  stop: () => void;
  toggle: (id: string) => void;
}

/**
 * A select mode for picking several items of a list by ID, such as to delete them at once.
 * Select mode is left whenever the reset key changes, such as when the list is filtered, so items that are no longer shown can't stay selected.
 */
export const useSelection = (resetKey: string): Selection => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);

  // Adjusted while rendering rather than in an effect, so the stale selection is never rendered.
  if (resetKey !== previousResetKey) {
    setPreviousResetKey(resetKey);
    setIsSelecting(false);
    setSelectedIds(new Set());
  }

  const clear = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const start = useCallback((): void => {
    setIsSelecting(true);
  }, []);

  const stop = useCallback((): void => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }

      return next;
    });
  }, []);

  return useMemo(() => ({ clear, isSelecting, selectedIds, start, stop, toggle }), [clear, isSelecting, selectedIds, start, stop, toggle]);
};
