import type { FC } from 'react';

export interface ShareBarProps {
  max: number;
  value: number;
}

/**
 * A thin bar showing a value relative to the largest one in its list, so the leader always fills the row.
 */
export const ShareBar: FC<ShareBarProps> = ({ max, value }) => {
  const width = `${(max === 0 ? 0 : (value / max) * 100).toString()}%`;

  return (
    <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary/70" style={{ width }} />
    </div>
  );
};
